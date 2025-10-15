"""Unit tests for geometry_utils module.

Tests cover calculate_distance, find_parallel_lines, and create_spatial_index
functions with various edge cases and scenarios.
"""

import unittest
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from geometry_utils import GeometryProcessor, get_geometry_processor


class TestGeometryProcessor(unittest.TestCase):
    """Test suite for GeometryProcessor class."""

    def setUp(self):
        """Set up test fixtures."""
        self.processor = GeometryProcessor()

    def test_calculate_distance_simple(self):
        """Test basic distance calculation between two points."""
        point1 = (0.0, 0.0)
        point2 = (3.0, 4.0)
        distance = self.processor.calculate_distance(point1, point2)
        self.assertAlmostEqual(distance, 5.0, places=5)

    def test_calculate_distance_same_point(self):
        """Test distance calculation when points are identical."""
        point = (5.0, 5.0)
        distance = self.processor.calculate_distance(point, point)
        self.assertAlmostEqual(distance, 0.0, places=5)

    def test_calculate_distance_negative_coordinates(self):
        """Test distance calculation with negative coordinates."""
        point1 = (-3.0, -4.0)
        point2 = (3.0, 4.0)
        distance = self.processor.calculate_distance(point1, point2)
        self.assertAlmostEqual(distance, 10.0, places=5)

    def test_calculate_distance_horizontal_line(self):
        """Test distance calculation for horizontal line."""
        point1 = (0.0, 5.0)
        point2 = (10.0, 5.0)
        distance = self.processor.calculate_distance(point1, point2)
        self.assertAlmostEqual(distance, 10.0, places=5)

    def test_calculate_distance_vertical_line(self):
        """Test distance calculation for vertical line."""
        point1 = (5.0, 0.0)
        point2 = (5.0, 10.0)
        distance = self.processor.calculate_distance(point1, point2)
        self.assertAlmostEqual(distance, 10.0, places=5)

    def test_find_parallel_lines_simple(self):
        """Test finding parallel lines with simple horizontal lines."""
        # Create horizontal lines that are parallel
        line1 = self.processor.create_line_string([(0, 0), (10, 0)])
        line2 = self.processor.create_line_string([(0, 5), (10, 5)])
        line3 = self.processor.create_line_string([(0, 0), (0, 10)])  # Vertical, not parallel
        
        lines = [line1, line2, line3]
        parallel_pairs = self.processor.find_parallel_lines(lines, tolerance=5.0)
        
        # line1 and line2 should be identified as parallel
        self.assertIn((0, 1), parallel_pairs)
        self.assertEqual(len(parallel_pairs), 1)

    def test_find_parallel_lines_vertical(self):
        """Test finding parallel vertical lines."""
        # Create vertical lines that are parallel
        line1 = self.processor.create_line_string([(0, 0), (0, 10)])
        line2 = self.processor.create_line_string([(5, 0), (5, 10)])
        line3 = self.processor.create_line_string([(0, 0), (10, 0)])  # Horizontal, not parallel
        
        lines = [line1, line2, line3]
        parallel_pairs = self.processor.find_parallel_lines(lines, tolerance=5.0)
        
        # line1 and line2 should be identified as parallel
        self.assertIn((0, 1), parallel_pairs)
        self.assertEqual(len(parallel_pairs), 1)

    def test_find_parallel_lines_diagonal(self):
        """Test finding parallel diagonal lines."""
        # Create diagonal lines with same slope
        line1 = self.processor.create_line_string([(0, 0), (10, 10)])
        line2 = self.processor.create_line_string([(5, 0), (15, 10)])
        
        lines = [line1, line2]
        parallel_pairs = self.processor.find_parallel_lines(lines, tolerance=5.0)
        
        # Both lines have 45-degree angle, should be parallel
        self.assertIn((0, 1), parallel_pairs)

    def test_find_parallel_lines_tolerance(self):
        """Test that tolerance parameter works correctly."""
        # Create lines with slightly different angles
        line1 = self.processor.create_line_string([(0, 0), (10, 0)])
        line2 = self.processor.create_line_string([(0, 0), (10, 1)])  # ~5.7 degrees
        
        lines = [line1, line2]
        
        # With loose tolerance, should find them as parallel
        parallel_pairs_loose = self.processor.find_parallel_lines(lines, tolerance=10.0)
        self.assertEqual(len(parallel_pairs_loose), 1)
        
        # With strict tolerance, should not find them as parallel
        parallel_pairs_strict = self.processor.find_parallel_lines(lines, tolerance=2.0)
        self.assertEqual(len(parallel_pairs_strict), 0)

    def test_find_parallel_lines_empty(self):
        """Test find_parallel_lines with empty list."""
        parallel_pairs = self.processor.find_parallel_lines([], tolerance=5.0)
        self.assertEqual(len(parallel_pairs), 0)

    def test_find_parallel_lines_single(self):
        """Test find_parallel_lines with single line."""
        line = self.processor.create_line_string([(0, 0), (10, 10)])
        parallel_pairs = self.processor.find_parallel_lines([line], tolerance=5.0)
        self.assertEqual(len(parallel_pairs), 0)

    def test_create_spatial_index_basic(self):
        """Test basic spatial index creation."""
        # Create some geometric objects
        geom1 = self.processor.create_line_string([(0, 0), (10, 0)])
        geom2 = self.processor.create_line_string([(0, 10), (10, 10)])
        geom3 = self.processor.create_line_string([(20, 20), (30, 30)])
        
        geometries = [geom1, geom2, geom3]
        idx = self.processor.create_spatial_index(geometries)
        
        # Test that index can query intersecting bounds
        # Query for geometries near origin
        results = list(idx.intersection((0, 0, 10, 10)))
        self.assertIn(0, results)  # geom1 should be found
        self.assertIn(1, results)  # geom2 should be found
        
    def test_create_spatial_index_query(self):
        """Test spatial index querying functionality."""
        # Create geometries in different regions
        geom1 = self.processor.create_line_string([(0, 0), (5, 5)])
        geom2 = self.processor.create_line_string([(10, 10), (15, 15)])
        geom3 = self.processor.create_line_string([(20, 20), (25, 25)])
        
        geometries = [geom1, geom2, geom3]
        idx = self.processor.create_spatial_index(geometries)
        
        # Query region around geom2
        results = list(idx.intersection((9, 9, 16, 16)))
        self.assertIn(1, results)  # Should find geom2
        self.assertEqual(len(results), 1)  # Should only find geom2

    def test_create_spatial_index_empty(self):
        """Test spatial index creation with empty list."""
        idx = self.processor.create_spatial_index([])
        results = list(idx.intersection((0, 0, 10, 10)))
        self.assertEqual(len(results), 0)


class TestSingletonPattern(unittest.TestCase):
    """Test singleton pattern for geometry processor."""

    def test_get_geometry_processor_singleton(self):
        """Test that get_geometry_processor returns same instance."""
        processor1 = get_geometry_processor()
        processor2 = get_geometry_processor()
        self.assertIs(processor1, processor2)

    def test_singleton_preserves_state(self):
        """Test that singleton instance preserves state."""
        processor1 = get_geometry_processor()
        # Trigger lazy loading of numpy
        _ = processor1.np
        
        processor2 = get_geometry_processor()
        # Should have numpy already loaded
        self.assertIsNotNone(processor2._numpy)


class TestLazyLoading(unittest.TestCase):
    """Test lazy loading of dependencies."""

    def test_lazy_numpy_loading(self):
        """Test that numpy is only loaded when accessed."""
        processor = GeometryProcessor()
        self.assertIsNone(processor._numpy)
        
        # Access np property to trigger loading
        np = processor.np
        self.assertIsNotNone(processor._numpy)
        self.assertIsNotNone(np)

    def test_lazy_shapely_loading(self):
        """Test that shapely is only loaded when accessed."""
        processor = GeometryProcessor()
        self.assertIsNone(processor._shapely)
        
        # Access shapely property to trigger loading
        shapely = processor.shapely
        self.assertIsNotNone(processor._shapely)
        self.assertIsNotNone(shapely)

    def test_lazy_rtree_loading(self):
        """Test that rtree is only loaded when accessed."""
        processor = GeometryProcessor()
        self.assertIsNone(processor._rtree_index)
        
        # Access rtree property to trigger loading
        rtree = processor.rtree
        self.assertIsNotNone(processor._rtree_index)
        self.assertIsNotNone(rtree)


if __name__ == '__main__':
    unittest.main()
