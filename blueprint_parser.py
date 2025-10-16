# blueprint_parser.py

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple

import fitz  # PyMuPDF
import numpy as np
import torch
import yaml
from scipy.spatial import KDTree

# --- Configure Logging ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# --- Custom Exceptions for Clear Error Reporting ---
class PDFParsingError(Exception):
    """Custom exception for errors during PDF processing."""
    pass

class ConfigurationError(Exception):
    """Custom exception for errors in the configuration file."""
    pass

class QuantumLayoutOptimizer:
    """Run a quantum-inspired walk over the fixture graph to rank layouts."""

    def __init__(self, settings: Dict[str, Any]):
        quantum_settings = settings.get("quantum_settings", {})
        self.dt = float(quantum_settings.get("time_step", 0.05))
        self.steps = int(quantum_settings.get("steps", 128))
        self.bias = float(quantum_settings.get("placement_bias", 1.0))
        self.max_states = int(quantum_settings.get("samples", 10))
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def _build_hamiltonian(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Tuple[int, int]],
        costs: List[float],
        harmonies: Dict[str, float],
    ) -> torch.Tensor:
        n_nodes = len(nodes)
        hamiltonian = torch.zeros((n_nodes, n_nodes), dtype=torch.cdouble, device=self.device)

        # Base costs sit on the diagonal of the Hamiltonian.
        for idx, cost in enumerate(costs):
            hamiltonian[idx, idx] = complex(cost, 0.0)

        # Couplings capture local harmony/dissonance between fixtures.
        for i, j in edges:
            harmony_key = f"{i}-{j}"
            harmony = harmonies.get(harmony_key, 0.0)

            # Negative harmony rewards proximity, positive harmony penalises it.
            coupling = -abs(harmony) if harmony < 0 else harmony + self.bias
            hamiltonian[i, j] = complex(coupling, 0.0)
            hamiltonian[j, i] = complex(coupling, 0.0)

        return hamiltonian

    def _simulate(self, hamiltonian: torch.Tensor) -> torch.Tensor:
        n_states = hamiltonian.size(0)
        if n_states == 0:
            return torch.empty(0, dtype=torch.cdouble, device=self.device)

        psi = torch.ones(n_states, dtype=torch.cdouble, device=self.device)
        psi /= torch.linalg.norm(psi)

        evolution_operator = torch.linalg.matrix_exp(-1j * hamiltonian * self.dt)
        for _ in range(self.steps):
            psi = evolution_operator @ psi
            psi /= torch.linalg.norm(psi)

        return psi

    def optimise(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Tuple[int, int]],
        costs: List[float],
        harmonies: Dict[str, float],
    ) -> Dict[str, Any]:
        hamiltonian = self._build_hamiltonian(nodes, edges, costs, harmonies)
        psi = self._simulate(hamiltonian)

        if psi.numel() == 0:
            return {"selected_nodes": [], "probabilities": []}

        probabilities = torch.abs(psi) ** 2
        count = min(self.max_states, probabilities.numel())
        top_probabilities, top_indices = torch.topk(probabilities.real, count)

        selections = [
            {
                "node": nodes[idx],
                "probability": float(prob),
            }
            for idx, prob in zip(top_indices.tolist(), top_probabilities.tolist())
        ]

        return {
            "selected_nodes": selections,
            "probabilities": probabilities.real.tolist(),
        }


class BlueprintParser:
    """
    An enterprise-quality tool to parse vector blueprints from PDFs,
    identify fixture nodes, and weave them into a structured graph.
    """
    def __init__(self, config: Dict[str, Any]):
        """
        Initializes the parser with a loaded configuration.

        Args:
            config (Dict[str, Any]): A dictionary containing settings from config.yaml.
        """
        try:
            self.settings = config['parser_settings']
            self.symbol_library = self.settings['symbol_library']
            self.harmony_rules = self.settings.get('harmony_rules', [])
            self.proximity_radius = self.settings['proximity_radius']
            logging.info("BlueprintParser initialized with provided configuration.")
        except KeyError as e:
            raise ConfigurationError(f"Missing required key in configuration file: {e}")

    def _extract_shapes(self, pdf_path: Path, page_number: int) -> List[Dict[str, Any]]:
        """Extracts all vector drawing paths from a specific page of a PDF."""
        if not pdf_path.exists():
            raise FileNotFoundError(f"Input PDF not found at: {pdf_path}")
        
        try:
            doc = fitz.open(pdf_path)
            if page_number >= doc.page_count:
                raise PDFParsingError(f"Invalid page number {page_number}. PDF has only {doc.page_count} pages.")
            
            page = doc.load_page(page_number)
            drawings = page.get_drawings()
            logging.info(f"📄 Extracted {len(drawings)} vector shapes from '{pdf_path.name}', page {page_number}.")
            return drawings
        except Exception as e:
            raise PDFParsingError(f"Failed to extract shapes from PDF: {e}")

    def _identify_fixtures(self, shapes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Classifies raw shapes into fixture nodes based on the symbol library."""
        fixture_nodes = []
        node_id_counter = 0
        
        for shape in shapes:
            if 'rect' not in shape:
                continue
            
            rect = shape['rect']
            width, height = rect.width, rect.height
            
            for symbol in self.symbol_library:
                s_width = symbol['dimensions']['width']
                s_height = symbol['dimensions']['height']
                tolerance = symbol['tolerance']
                
                if (abs(width - s_width) < tolerance and abs(height - s_height) < tolerance):
                    fixture_nodes.append({
                        'id': node_id_counter,
                        'type': symbol['name'],
                        'pos': (rect.center.x, rect.center.y),
                        'base_cost': symbol['base_cost']
                    })
                    node_id_counter += 1
                    break
                    
        logging.info(f"🔍 Identified {len(fixture_nodes)} fixture nodes from shapes.")
        return fixture_nodes

    def _weave_graph(self, nodes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Builds the graph matrices (edges, costs, harmonies) from fixture nodes."""
        if not nodes:
            logging.warning("No nodes identified, returning an empty graph.")
            return {"nodes": [], "edges": [], "costs": [], "harmonies": {}}

        n_nodes = len(nodes)
        positions = np.array([node['pos'] for node in nodes])
        costs_vector = [node['base_cost'] for node in nodes]
        
        adjacency_edges = []
        harmonies_dict = {}

        kdtree = KDTree(positions)
        pairs = kdtree.query_pairs(r=self.proximity_radius)

        for i, j in pairs:
            adjacency_edges.append((i, j))
            
            node_i_type = nodes[i]['type']
            node_j_type = nodes[j]['type']
            
            for rule in self.harmony_rules:
                if (rule['type1'] == node_i_type and rule['type2'] == node_j_type) or \
                   (rule['type1'] == node_j_type and rule['type2'] == node_i_type):
                    harmonies_dict[f"{i}-{j}"] = rule['weight']
                    break
        
        logging.info(f"🕸️ Wove graph with {n_nodes} nodes and {len(adjacency_edges)} proximity-based edges.")
        
        return {
            "nodes": nodes,
            "edges": adjacency_edges,
            "costs": costs_vector,
            "harmonies": harmonies_dict
        }

    def process_blueprint(self, pdf_path: Path, page_number: int) -> Dict[str, Any]:
        """
        Executes the full parsing and weaving pipeline.
        
        Args:
            pdf_path (Path): Path to the input PDF file.
            page_number (int): The page number to process (0-indexed).
            
        Returns:
            Dict[str, Any]: The final structured graph data.
        """
        logging.info(f"Starting blueprint processing for '{pdf_path.name}'...")
        raw_shapes = self._extract_shapes(pdf_path, page_number)
        fixture_nodes = self._identify_fixtures(raw_shapes)
        graph_data = self._weave_graph(fixture_nodes)
        logging.info("Blueprint processing completed successfully.")

        optimiser = QuantumLayoutOptimizer(self.settings)
        optimisation = optimiser.optimise(
            graph_data["nodes"],
            graph_data["edges"],
            graph_data["costs"],
            graph_data["harmonies"],
        )

        return {
            "graph": graph_data,
            "quantum_solution": optimisation,
        }

def main():
    """Main function to run the CLI tool."""
    parser = argparse.ArgumentParser(description="Blueprint to Graph Parser - An enterprise tool for converting PDF blueprints into structured graph data.")
    parser.add_argument("-i", "--input", required=True, type=Path, help="Path to the input blueprint PDF file.")
    parser.add_argument("-o", "--output", required=True, type=Path, help="Path to save the output JSON graph file.")
    parser.add_argument("-c", "--config", required=True, type=Path, help="Path to the YAML configuration file.")
    parser.add_argument("-p", "--page", type=int, default=0, help="The page number of the PDF to process (default: 0).")
    args = parser.parse_args()

    try:
        with open(args.config, 'r') as f:
            config = yaml.safe_load(f)
        
        blueprint_parser = BlueprintParser(config)
        final_graph = blueprint_parser.process_blueprint(args.input, args.page)
        
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with open(args.output, 'w') as f:
            json.dump(final_graph, f, indent=4)
            
        logging.info(f"✅ Successfully saved graph data to '{args.output}'")

    except (FileNotFoundError, PDFParsingError, ConfigurationError) as e:
        logging.error(f"A critical error occurred: {e}")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}", exc_info=True)

if __name__ == "__main__":
    main()
