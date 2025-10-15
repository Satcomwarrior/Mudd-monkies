"""
Sector Processing and Layer Veiling System
===========================================
Handles blueprint partitioning, layer-based filtering, and parallel sector optimization.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Tuple

import numpy as np
import torch

from quantum_blueprint_optimizer import (
    FixtureNode,
    FixtureType,
    LayerProfile,
    OptimizationResult,
    QuantumBlueprintOptimizer,
    SectorConfig,
)


class LayerVeilingSystem:
    """Manage layer-based node visibility and filtering."""

    _DAMPENED_VISIBILITY = 0.05

    def __init__(self) -> None:
        self._profile_map = {
            LayerProfile.ALL_LAYERS: self._all_layers_profile,
            LayerProfile.ELECTRICAL_ONLY: self._electrical_only_profile,
            LayerProfile.HVAC_ONLY: self._hvac_only_profile,
            LayerProfile.STRUCTURAL_ONLY: self._structural_only_profile,
            LayerProfile.ELECTRICAL_HVAC: self._electrical_hvac_profile,
            LayerProfile.MECHANICAL: self._mechanical_profile,
        }

    def get_veil_factors(
        self, nodes: Iterable[FixtureNode], profile: LayerProfile
    ) -> np.ndarray:
        """Return veil factor vector for the requested layer profile."""

        nodes_list = list(nodes)
        if not nodes_list:
            return np.zeros(0)

        profile_func = self._profile_map.get(profile, self._all_layers_profile)
        return profile_func(nodes_list)

    def _all_layers_profile(self, nodes: List[FixtureNode]) -> np.ndarray:
        return np.ones(len(nodes))

    def _electrical_only_profile(self, nodes: List[FixtureNode]) -> np.ndarray:
        electrical_types = {
            FixtureType.SOCKET,
            FixtureType.SWITCH,
            FixtureType.LIGHT,
            FixtureType.OUTLET,
        }
        return np.array(
            [
                1.0 if node.fixture_type in electrical_types else self._DAMPENED_VISIBILITY
                for node in nodes
            ]
        )

    def _hvac_only_profile(self, nodes: List[FixtureNode]) -> np.ndarray:
        hvac_types = {FixtureType.VENT, FixtureType.DUCT}
        return np.array(
            [
                1.0 if node.fixture_type in hvac_types else self._DAMPENED_VISIBILITY
                for node in nodes
            ]
        )

    def _structural_only_profile(self, nodes: List[FixtureNode]) -> np.ndarray:
        structural_types = {FixtureType.BEAM}
        return np.array(
            [
                1.0 if node.fixture_type in structural_types else self._DAMPENED_VISIBILITY
                for node in nodes
            ]
        )

    def _electrical_hvac_profile(self, nodes: List[FixtureNode]) -> np.ndarray:
        electrical_types = {
            FixtureType.SOCKET,
            FixtureType.SWITCH,
            FixtureType.LIGHT,
            FixtureType.OUTLET,
        }
        hvac_types = {FixtureType.VENT, FixtureType.DUCT}

        return np.array(
            [
                0.8
                if node.fixture_type in electrical_types
                else 0.7
                if node.fixture_type in hvac_types
                else 0.2
                for node in nodes
            ]
        )

    def _mechanical_profile(self, nodes: List[FixtureNode]) -> np.ndarray:
        mechanical_types = {
            FixtureType.VENT,
            FixtureType.DUCT,
            FixtureType.PIPE,
            FixtureType.BEAM,
        }
        return np.array(
            [
                0.9 if node.fixture_type in mechanical_types else 0.3
                for node in nodes
            ]
        )


@dataclass
class SectorOptimizationTask:
    config: SectorConfig
    veil_profile: LayerProfile
    extra_context: Optional[Dict[str, torch.Tensor]] = None


class SectorProcessor:
    """Partition blueprints and optimize each sector in parallel."""

    def __init__(
        self,
        optimizer: QuantumBlueprintOptimizer,
        veiling_system: LayerVeilingSystem,
        max_workers: Optional[int] = None,
    ) -> None:
        self.optimizer = optimizer
        self.veiling_system = veiling_system
        self.max_workers = max_workers

    def create_sectors(
        self,
        nodes: Iterable[FixtureNode],
        max_nodes_per_sector: int = 512,
        sector_grid: Tuple[int, int] = (4, 4),
    ) -> List[SectorConfig]:
        nodes_list = list(nodes)
        if not nodes_list:
            return []

        positions = np.array([node.position for node in nodes_list])
        min_x, min_y = positions.min(axis=0)
        max_x, max_y = positions.max(axis=0)

        rows, cols = sector_grid
        sector_width = (max_x - min_x) / max(cols, 1)
        sector_height = (max_y - min_y) / max(rows, 1)

        sectors: List[SectorConfig] = []
        sector_id = 0

        for row in range(rows):
            for col in range(cols):
                x1 = min_x + col * sector_width
                x2 = x1 + sector_width
                y1 = min_y + row * sector_height
                y2 = y1 + sector_height

                sector_nodes = [
                    node
                    for node in nodes_list
                    if x1 <= node.position[0] < x2 and y1 <= node.position[1] < y2
                ]

                if not sector_nodes:
                    continue

                if len(sector_nodes) > max_nodes_per_sector:
                    continue

                margin = 0.1
                boundaries = [
                    node.id
                    for node in sector_nodes
                    if (
                        node.position[0] < x1 + margin * sector_width
                        or node.position[0] > x2 - margin * sector_width
                        or node.position[1] < y1 + margin * sector_height
                        or node.position[1] > y2 - margin * sector_height
                    )
                ]

                sectors.append(
                    SectorConfig(
                        sector_id=sector_id,
                        nodes=sector_nodes,
                        boundaries=boundaries,
                        bounding_box=(x1, y1, x2, y2),
                    )
                )
                sector_id += 1

        return sectors

    def build_sector_graph(
        self, sector: SectorConfig, connection_threshold: float = 10.0
    ) -> Tuple[np.ndarray, Dict[Tuple[int, int], float]]:
        adjacency = np.zeros((len(sector.nodes), len(sector.nodes)))
        harmonies: Dict[Tuple[int, int], float] = {}

        for i, node_i in enumerate(sector.nodes):
            for j in range(i + 1, len(sector.nodes)):
                node_j = sector.nodes[j]
                distance = float(
                    np.linalg.norm(np.array(node_i.position) - np.array(node_j.position))
                )

                if distance >= connection_threshold:
                    continue

                adjacency[i, j] = adjacency[j, i] = 1
                harmony = self._calculate_fixture_harmony(
                    node_i.fixture_type, node_j.fixture_type, distance
                )
                if harmony:
                    harmonies[(i, j)] = harmony

        return adjacency, harmonies

    def _calculate_fixture_harmony(
        self, type1: FixtureType, type2: FixtureType, distance: float
    ) -> float:
        if type1 == FixtureType.SOCKET and type2 == FixtureType.SWITCH:
            return -0.5 / (1 + distance * 0.1)
        if type1 == FixtureType.VENT and type2 == FixtureType.DUCT:
            return -0.8 / (1 + distance * 0.1)
        if type1 == FixtureType.BEAM and type2 == FixtureType.BEAM:
            return -0.3 / (1 + distance * 0.1)
        if distance < 3.0:
            return -0.2
        return 0.0

    def optimize_sector(
        self, task: SectorOptimizationTask
    ) -> OptimizationResult:
        veil_factors = self.veiling_system.get_veil_factors(
            task.config.nodes, task.veil_profile
        )
        adjacency, harmonies = self.build_sector_graph(task.config)
        return self.optimizer.optimize_sector(
            config=task.config,
            adjacency_matrix=adjacency,
            harmonies=harmonies,
            veil_factors=veil_factors,
            extra_context=task.extra_context,
        )

    def optimize_sectors(
        self, tasks: Iterable[SectorOptimizationTask]
    ) -> List[OptimizationResult]:
        tasks_list = list(tasks)
        if not tasks_list:
            return []

        results: List[OptimizationResult] = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_map = {
                executor.submit(self.optimize_sector, task): task
                for task in tasks_list
            }
            for future in as_completed(future_map):
                results.append(future.result())
        return results

