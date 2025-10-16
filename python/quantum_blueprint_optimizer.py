"""Quantum-inspired optimizer for blueprint fixture layouts.

This module provides the foundational data structures shared across the
blueprint optimisation pipeline together with a small, well-documented
quantum-walk-inspired solver.  The implementation is intentionally
explicit so integrators can audit the maths without marketing jargon.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import torch


class FixtureType(str, Enum):
    """Enumeration of the supported fixture categories."""

    SOCKET = "socket"
    SWITCH = "switch"
    LIGHT = "light"
    OUTLET = "outlet"
    VENT = "vent"
    DUCT = "duct"
    PIPE = "pipe"
    BEAM = "beam"
    GENERIC = "generic"


class LayerProfile(str, Enum):
    """Visibility presets used by :class:`LayerVeilingSystem`."""

    ALL_LAYERS = "all_layers"
    ELECTRICAL_ONLY = "electrical_only"
    HVAC_ONLY = "hvac_only"
    STRUCTURAL_ONLY = "structural_only"
    ELECTRICAL_HVAC = "electrical_hvac"
    MECHANICAL = "mechanical"


@dataclass(slots=True)
class FixtureNode:
    """Representation of a single fixture candidate on the blueprint."""

    id: str
    position: Tuple[float, float]
    fixture_type: FixtureType
    attributes: Optional[Dict[str, float]] = None


@dataclass(slots=True)
class SectorConfig:
    """Partition of the blueprint processed as an optimisation unit."""

    sector_id: int
    nodes: List[FixtureNode]
    boundaries: Sequence[str]
    bounding_box: Tuple[float, float, float, float]


@dataclass(slots=True)
class OptimizationResult:
    """Optimisation outcome for a single sector."""

    sector_id: int
    node_probabilities: Dict[str, float]
    selected_nodes: List[str]
    wavefunction: torch.Tensor


class QuantumBlueprintOptimizer:
    """Quantum-walk inspired optimiser backed by PyTorch.

    The solver builds a Hamiltonian that encodes pairwise compatibilities,
    per-node visibility weights ("veil factors"), and any explicit user
    preferences.  It then simulates the time evolution of an amplitude
    vector ``psi`` under that Hamiltonian and samples the most probable
    fixture placements from the resulting probability distribution.
    """

    def __init__(
        self,
        time_steps: int = 48,
        dt: float = 0.05,
        laplacian_weight: float = 1.0,
        harmony_weight: float = 1.0,
        veil_weight: float = 0.35,
        preference_weight: float = 0.5,
        selection_ratio: float = 0.25,
        device: Optional[torch.device] = None,
    ) -> None:
        self.time_steps = time_steps
        self.dt = dt
        self.laplacian_weight = laplacian_weight
        self.harmony_weight = harmony_weight
        self.veil_weight = veil_weight
        self.preference_weight = preference_weight
        self.selection_ratio = selection_ratio
        if device is None:
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.device = device

    def optimise_sector(
        self,
        config: SectorConfig,
        adjacency_matrix: np.ndarray,
        harmonies: Dict[Tuple[int, int], float],
        veil_factors: np.ndarray,
        extra_context: Optional[Dict[str, torch.Tensor]] = None,
    ) -> OptimizationResult:
        """Optimise a sector by simulating a continuous-time quantum walk."""

        return self.optimize_sector(
            config=config,
            adjacency_matrix=adjacency_matrix,
            harmonies=harmonies,
            veil_factors=veil_factors,
            extra_context=extra_context,
        )

    def optimize_sector(
        self,
        config: SectorConfig,
        adjacency_matrix: np.ndarray,
        harmonies: Dict[Tuple[int, int], float],
        veil_factors: np.ndarray,
        extra_context: Optional[Dict[str, torch.Tensor]] = None,
    ) -> OptimizationResult:
        if not config.nodes:
            raise ValueError("Sector configuration must contain at least one node")

        adjacency = torch.as_tensor(
            adjacency_matrix, dtype=torch.float32, device=self.device
        )
        veil = torch.as_tensor(veil_factors, dtype=torch.float32, device=self.device)
        node_count = adjacency.shape[0]

        if adjacency.shape != (node_count, node_count):
            raise ValueError("adjacency_matrix must be square with size equal to nodes")
        if veil.shape[0] != node_count:
            raise ValueError("veil_factors length must match node count")

        hamiltonian = self._build_hamiltonian(adjacency, harmonies, veil, extra_context)
        wavefunction = self._simulate_walk(hamiltonian, node_count)
        probabilities = wavefunction.abs() ** 2
        probabilities = probabilities / probabilities.sum()

        node_probabilities = {
            node.id: float(probabilities[idx].item())
            for idx, node in enumerate(config.nodes)
        }

        selected_nodes = self._select_nodes(config, probabilities)

        return OptimizationResult(
            sector_id=config.sector_id,
            node_probabilities=node_probabilities,
            selected_nodes=selected_nodes,
            wavefunction=wavefunction.detach().cpu(),
        )

    def _build_hamiltonian(
        self,
        adjacency: torch.Tensor,
        harmonies: Dict[Tuple[int, int], float],
        veil: torch.Tensor,
        extra_context: Optional[Dict[str, torch.Tensor]] = None,
    ) -> torch.Tensor:
        laplacian = torch.diag(adjacency.sum(dim=1)) - adjacency
        hamiltonian = self.laplacian_weight * laplacian

        if harmonies:
            harmony_matrix = torch.zeros_like(adjacency)
            for (i, j), value in harmonies.items():
                if i >= adjacency.shape[0] or j >= adjacency.shape[0]:
                    raise IndexError("Harmony index outside of adjacency bounds")
                harmony_matrix[i, j] += value
                harmony_matrix[j, i] += value
            hamiltonian += self.harmony_weight * harmony_matrix

        if veil.numel():
            visibility_penalty = torch.diag(1.0 - torch.clamp(veil, 0.0, 1.0))
            hamiltonian += self.veil_weight * visibility_penalty

        if extra_context:
            preference_vector = extra_context.get("preference_vector")
            if preference_vector is not None:
                pref = preference_vector.to(self.device, dtype=torch.float32)
                if pref.shape[0] != adjacency.shape[0]:
                    raise ValueError(
                        "preference_vector must align with number of nodes in sector"
                    )
                hamiltonian -= self.preference_weight * torch.diag(pref)

            penalty_matrix = extra_context.get("penalty_matrix")
            if penalty_matrix is not None:
                penalty = penalty_matrix.to(self.device, dtype=torch.float32)
                if penalty.shape != adjacency.shape:
                    raise ValueError("penalty_matrix must match adjacency size")
                hamiltonian += penalty

        return hamiltonian.to(torch.complex64)

    def _simulate_walk(self, hamiltonian: torch.Tensor, node_count: int) -> torch.Tensor:
        psi = torch.full(
            (node_count,),
            fill_value=1.0 / math.sqrt(node_count),
            dtype=torch.complex64,
            device=self.device,
        )

        U = torch.linalg.matrix_exp(-1j * hamiltonian * self.dt)

        for _ in range(self.time_steps):
            psi = U @ psi
            norm = torch.linalg.norm(psi)
            if torch.isnan(norm) or norm == 0:
                raise FloatingPointError("Wavefunction collapsed to an invalid state")
            psi = psi / norm

        return psi

    def _select_nodes(
        self, config: SectorConfig, probabilities: torch.Tensor
    ) -> List[str]:
        node_count = probabilities.shape[0]
        select_count = max(1, int(math.ceil(node_count * self.selection_ratio)))
        select_count = min(select_count, node_count)

        top_probabilities, indices = torch.topk(probabilities, select_count)
        threshold = top_probabilities[-1].item()

        selected = [
            node.id
            for node, prob in zip(config.nodes, probabilities.tolist())
            if prob >= threshold
        ]
        return selected


__all__ = [
    "FixtureNode",
    "FixtureType",
    "LayerProfile",
    "OptimizationResult",
    "QuantumBlueprintOptimizer",
    "SectorConfig",
]
