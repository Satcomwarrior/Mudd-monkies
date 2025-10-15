"""Unit tests for ocr_service module.

Tests cover singleton pattern, dependency injection, and multithreaded access
using mock OCRPipeline to avoid keras_ocr dependency in tests.
"""

import unittest
import threading
import sys
import os
from unittest.mock import MagicMock, patch
import time

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from ocr_service import (
    OCRService,
    BlueprintAnalysisService,
    get_ocr_pipeline,
    KerasOCRPipelineWrapper
)
from ocr_mock import MockOCRPipeline


class TestOCRServiceWithMock(unittest.TestCase):
    """Test OCR service using mock pipeline."""

    def setUp(self):
        """Set up test fixtures with mock pipeline."""
        self.mock_pipeline = MockOCRPipeline()
        self.service = OCRService(pipeline=self.mock_pipeline)

    def test_extract_text_from_images_basic(self):
        """Test basic text extraction from images."""
        # Create mock images
        images = [MagicMock(), MagicMock()]
        
        # Call extract_text_from_images
        results = self.service.extract_text_from_images(images)
        
        # Verify results structure
        self.assertIsInstance(results, list)
        self.assertEqual(len(results), 2)
        
        # Each result should be a list of (text, bbox) tuples
        for result in results:
            self.assertIsInstance(result, list)
            for text, bbox in result:
                self.assertIsInstance(text, str)
                self.assertIsInstance(bbox, list)

    def test_extract_measurements(self):
        """Test measurement extraction from blueprint image."""
        image = MagicMock()
        
        measurements = self.service.extract_measurements(image)
        
        # Verify measurements structure
        self.assertIsInstance(measurements, list)
        for measurement in measurements:
            self.assertIn('text', measurement)
            self.assertIn('position', measurement)
            self.assertIn('bounding_box', measurement)
            self.assertIn('confidence', measurement)
            
            # Verify position is a tuple of two coordinates
            self.assertIsInstance(measurement['position'], tuple)
            self.assertEqual(len(measurement['position']), 2)

    def test_extract_measurements_with_confidence_threshold(self):
        """Test that confidence threshold parameter is accepted."""
        image = MagicMock()
        
        # Should work with different confidence thresholds
        measurements_low = self.service.extract_measurements(image, confidence_threshold=0.3)
        measurements_high = self.service.extract_measurements(image, confidence_threshold=0.7)
        
        self.assertIsInstance(measurements_low, list)
        self.assertIsInstance(measurements_high, list)

    def test_dependency_injection(self):
        """Test that custom pipeline can be injected."""
        custom_mock = MockOCRPipeline()
        custom_service = OCRService(pipeline=custom_mock)
        
        # Verify the custom pipeline is being used
        self.assertIs(custom_service._pipeline, custom_mock)

    def test_extract_text_calls_recognize(self):
        """Test that extract_text_from_images calls the pipeline's recognize method."""
        mock_pipeline = MagicMock()
        mock_pipeline.recognize.return_value = [[('test', [[0, 0], [10, 0], [10, 10], [0, 10]])]]
        
        service = OCRService(pipeline=mock_pipeline)
        images = [MagicMock()]
        
        service.extract_text_from_images(images)
        
        # Verify recognize was called with the images
        mock_pipeline.recognize.assert_called_once_with(images)


class TestBlueprintAnalysisService(unittest.TestCase):
    """Test blueprint analysis service."""

    def setUp(self):
        """Set up test fixtures."""
        self.mock_pipeline = MockOCRPipeline()
        self.ocr_service = OCRService(pipeline=self.mock_pipeline)
        self.analysis_service = BlueprintAnalysisService(ocr_service=self.ocr_service)

    def test_analyze_blueprint_with_measurements(self):
        """Test blueprint analysis with measurement extraction."""
        image = MagicMock()
        
        results = self.analysis_service.analyze_blueprint(image, extract_measurements=True)
        
        # Verify result structure
        self.assertIsInstance(results, dict)
        self.assertIn('measurements', results)
        self.assertIn('text_regions', results)
        self.assertIsInstance(results['measurements'], list)

    def test_analyze_blueprint_without_measurements(self):
        """Test blueprint analysis without measurement extraction."""
        image = MagicMock()
        
        results = self.analysis_service.analyze_blueprint(image, extract_measurements=False)
        
        # Verify result structure
        self.assertIsInstance(results, dict)
        self.assertIn('measurements', results)
        self.assertIn('text_regions', results)
        self.assertIsInstance(results['text_regions'], list)

    def test_dependency_injection(self):
        """Test that OCR service can be injected."""
        custom_ocr_service = OCRService(pipeline=MockOCRPipeline())
        analysis_service = BlueprintAnalysisService(ocr_service=custom_ocr_service)
        
        self.assertIs(analysis_service._ocr_service, custom_ocr_service)

    def test_analyze_blueprint_default_service(self):
        """Test that analysis service can create default OCR service."""
        # Create analysis service without injecting OCR service
        with patch('ocr_service.get_ocr_pipeline'):
            analysis_service = BlueprintAnalysisService()
            self.assertIsNotNone(analysis_service._ocr_service)


class TestSingletonPattern(unittest.TestCase):
    """Test singleton pattern for OCR pipeline."""

    def tearDown(self):
        """Clean up singleton instance after each test."""
        # Reset singleton for clean test state
        import ocr_service
        ocr_service._pipeline_instance = None

    def test_get_ocr_pipeline_returns_same_instance(self):
        """Test that get_ocr_pipeline returns the same instance."""
        with patch('ocr_service.KerasOCRPipelineWrapper') as MockWrapper:
            mock_instance = MagicMock()
            MockWrapper.return_value = mock_instance
            
            pipeline1 = get_ocr_pipeline()
            pipeline2 = get_ocr_pipeline()
            
            self.assertIs(pipeline1, pipeline2)
            # Wrapper should only be instantiated once
            MockWrapper.assert_called_once()

    def test_singleton_thread_safety(self):
        """Test that singleton is thread-safe."""
        instances = []
        
        def get_instance():
            # Add small delay to increase chance of race condition
            time.sleep(0.01)
            instances.append(get_ocr_pipeline())
        
        with patch('ocr_service.KerasOCRPipelineWrapper') as MockWrapper:
            mock_instance = MagicMock()
            MockWrapper.return_value = mock_instance
            
            # Create multiple threads that all try to get the singleton
            threads = [threading.Thread(target=get_instance) for _ in range(10)]
            
            for thread in threads:
                thread.start()
            
            for thread in threads:
                thread.join()
            
            # All instances should be the same object
            for instance in instances:
                self.assertIs(instance, instances[0])
            
            # Wrapper should only be instantiated once despite multiple threads
            MockWrapper.assert_called_once()


class TestKerasOCRPipelineWrapper(unittest.TestCase):
    """Test KerasOCRPipelineWrapper lazy initialization."""

    def test_lazy_initialization(self):
        """Test that pipeline is not initialized until accessed."""
        with patch('ocr_service.keras_ocr') as mock_keras:
            wrapper = KerasOCRPipelineWrapper()
            
            # Pipeline should not be initialized yet
            self.assertIsNone(wrapper._pipeline)
            mock_keras.assert_not_called()
            
            # Access the pipeline property to trigger initialization
            _ = wrapper.pipeline
            
            # Now it should be initialized
            self.assertIsNotNone(wrapper._pipeline)

    def test_double_check_locking(self):
        """Test that double-check locking works correctly."""
        with patch('ocr_service.keras_ocr') as mock_keras:
            mock_pipeline = MagicMock()
            mock_keras.pipeline.Pipeline.return_value = mock_pipeline
            
            wrapper = KerasOCRPipelineWrapper()
            
            # Access pipeline multiple times
            p1 = wrapper.pipeline
            p2 = wrapper.pipeline
            p3 = wrapper.pipeline
            
            # All should be the same instance
            self.assertIs(p1, p2)
            self.assertIs(p2, p3)
            
            # Pipeline should only be created once
            mock_keras.pipeline.Pipeline.assert_called_once()

    def test_recognize_method(self):
        """Test that recognize method delegates to the pipeline."""
        with patch('ocr_service.keras_ocr') as mock_keras:
            mock_pipeline = MagicMock()
            mock_keras.pipeline.Pipeline.return_value = mock_pipeline
            mock_pipeline.recognize.return_value = 'test_result'
            
            wrapper = KerasOCRPipelineWrapper()
            images = [MagicMock()]
            
            result = wrapper.recognize(images)
            
            # Verify the result is from the pipeline
            self.assertEqual(result, 'test_result')
            mock_pipeline.recognize.assert_called_once_with(images)


class TestMultithreadedAccess(unittest.TestCase):
    """Test multithreaded access to OCR service."""

    def test_concurrent_ocr_calls(self):
        """Test that multiple threads can use OCR service concurrently."""
        mock_pipeline = MockOCRPipeline()
        service = OCRService(pipeline=mock_pipeline)
        
        results = []
        errors = []
        
        def worker(thread_id):
            try:
                image = MagicMock()
                measurements = service.extract_measurements(image)
                results.append((thread_id, measurements))
            except Exception as e:
                errors.append((thread_id, e))
        
        # Create multiple threads
        threads = [threading.Thread(target=worker, args=(i,)) for i in range(20)]
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all to complete
        for thread in threads:
            thread.join()
        
        # Verify no errors occurred
        self.assertEqual(len(errors), 0, f"Errors occurred: {errors}")
        
        # Verify all threads completed successfully
        self.assertEqual(len(results), 20)

    def test_concurrent_analysis_calls(self):
        """Test that multiple threads can use analysis service concurrently."""
        mock_pipeline = MockOCRPipeline()
        ocr_service = OCRService(pipeline=mock_pipeline)
        analysis_service = BlueprintAnalysisService(ocr_service=ocr_service)
        
        results = []
        errors = []
        
        def worker(thread_id):
            try:
                image = MagicMock()
                analysis = analysis_service.analyze_blueprint(image)
                results.append((thread_id, analysis))
            except Exception as e:
                errors.append((thread_id, e))
        
        # Create multiple threads
        threads = [threading.Thread(target=worker, args=(i,)) for i in range(20)]
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all to complete
        for thread in threads:
            thread.join()
        
        # Verify no errors occurred
        self.assertEqual(len(errors), 0, f"Errors occurred: {errors}")
        
        # Verify all threads completed successfully
        self.assertEqual(len(results), 20)


if __name__ == '__main__':
    unittest.main()
