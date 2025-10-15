"""Geometry utilities with lazy import optimization.

This module demonstrates lazy loading of heavy dependencies (numpy, shapely, rtree)
to reduce startup time and memory footprint.
"""

import math
from typing import List, Tuple, Optional


class GeometryProcessor:
    """Process geometric operations with lazy-loaded dependencies."""

    def __init__(self):
        self._numpy = None
        self._shapely = None
        self._rtree_index = None

    @property
    def np(self):
        """Lazy load numpy only when needed."""
        if self._numpy is None:
            import numpy as np
            self._numpy = np
        return self._numpy

    @property
    def shapely(self):
        """Lazy load shapely only when needed."""
        if self._shapely is None:
            import shapely.geometry
            self._shapely = shapely.geometry
        return self._shapely

    @property
    def rtree(self):
        """Lazy load rtree only when needed."""
        if self._rtree_index is None:
            from rtree import index
            self._rtree_index = index
        return self._rtree_index

    def calculate_distance(self, point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
        """Calculate distance between two points.
        
        Uses numpy for efficient computation when available.
        """
        np = self.np
        p1 = np.array(point1)
        p2 = np.array(point2)
        return float(np.linalg.norm(p1 - p2))

    def create_line_string(self, coordinates: List[Tuple[float, float]]):
        """Create a LineString from coordinates.
        
        Shapely is only imported when this method is called.
        """
        return self.shapely.LineString(coordinates)

    def create_spatial_index(self, geometries: List):
        """Create spatial index for efficient geometric queries.
        
        Rtree is only imported when this method is called.
        """
        idx = self.rtree.Index()
        for i, geom in enumerate(geometries):
            idx.insert(i, geom.bounds)
        return idx

    def find_parallel_lines(self, lines: List, tolerance: float = 5.0) -> List[Tuple[int, int]]:
        """Find parallel lines within tolerance using lazy-loaded dependencies."""
        np = self.np
        parallel_pairs = []
        
        for i in range(len(lines)):
            for j in range(i + 1, len(lines)):
                line1_coords = list(lines[i].coords)
                line2_coords = list(lines[j].coords)
                
                # Calculate angles
                angle1 = math.atan2(
                    line1_coords[-1][1] - line1_coords[0][1],
                    line1_coords[-1][0] - line1_coords[0][0]
                )
                angle2 = math.atan2(
                    line2_coords[-1][1] - line2_coords[0][1],
                    line2_coords[-1][0] - line2_coords[0][0]
                )
                
                angle_diff = abs(math.degrees(angle1 - angle2))
                if angle_diff < tolerance or abs(180 - angle_diff) < tolerance:
                    parallel_pairs.append((i, j))
        
        return parallel_pairs


# Module-level instance for convenient access
_geometry_processor = None


def get_geometry_processor() -> GeometryProcessor:
    """Get or create singleton geometry processor instance.
    
    This ensures heavy imports are only done once and only when needed.
    """
    global _geometry_processor
    if _geometry_processor is None:
        _geometry_processor = GeometryProcessor()
    return _geometry_processor
