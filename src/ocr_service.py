"""OCR Service with singleton pattern and dependency injection.

This module demonstrates:
1. Singleton pattern for expensive keras_ocr pipeline initialization
2. Dependency injection for testing and flexibility
3. Lazy loading to defer initialization until first use
"""

from typing import List, Tuple, Optional, Protocol
import threading


class OCRPipeline(Protocol):
    """Protocol for OCR pipeline interface."""
    
    def recognize(self, images: List) -> List:
        """Recognize text in images."""
        ...


class KerasOCRPipelineWrapper:
    """Wrapper for keras_ocr pipeline with lazy initialization."""
    
    def __init__(self):
        self._pipeline = None
        self._lock = threading.Lock()
    
    @property
    def pipeline(self):
        """Lazy load keras_ocr pipeline only when first accessed.
        
        This ensures the heavy initialization only happens once and
        only when actually needed.
        """
        if self._pipeline is None:
            with self._lock:
                # Double-check locking pattern
                if self._pipeline is None:
                    # Lazy import keras_ocr to avoid loading TensorFlow at startup
                    import keras_ocr
                    self._pipeline = keras_ocr.pipeline.Pipeline()
        return self._pipeline
    
    def recognize(self, images: List) -> List:
        """Recognize text in images using the singleton pipeline."""
        return self.pipeline.recognize(images)


# Global singleton instance
_pipeline_instance: Optional[KerasOCRPipelineWrapper] = None
_instance_lock = threading.Lock()


def get_ocr_pipeline() -> KerasOCRPipelineWrapper:
    """Get or create singleton OCR pipeline instance.
    
    This ensures keras_ocr.pipeline.Pipeline is initialized only once
    across the entire application, even with multiple threads.
    
    Returns:
        KerasOCRPipelineWrapper: Singleton OCR pipeline instance
    """
    global _pipeline_instance
    if _pipeline_instance is None:
        with _instance_lock:
            if _pipeline_instance is None:
                _pipeline_instance = KerasOCRPipelineWrapper()
    return _pipeline_instance


class OCRService:
    """OCR service with dependency injection pattern.
    
    This class demonstrates proper dependency injection, allowing
    the OCR pipeline to be injected for testing and flexibility.
    """
    
    def __init__(self, pipeline: Optional[OCRPipeline] = None):
        """Initialize OCR service with optional pipeline injection.
        
        Args:
            pipeline: OCR pipeline to use. If None, uses singleton instance.
        """
        self._pipeline = pipeline or get_ocr_pipeline()
    
    def extract_text_from_images(self, images: List) -> List[List[Tuple[str, List[Tuple[int, int]]]]]:
        """Extract text and bounding boxes from images.
        
        Args:
            images: List of images to process
            
        Returns:
            List of recognized text with bounding boxes for each image
        """
        return self._pipeline.recognize(images)
    
    def extract_measurements(self, image, confidence_threshold: float = 0.5) -> List[dict]:
        """Extract measurement annotations from blueprint image.
        
        Args:
            image: Blueprint image to analyze
            confidence_threshold: Minimum confidence for text detection
            
        Returns:
            List of measurement dictionaries with text, position, and confidence
        """
        results = self._pipeline.recognize([image])[0]
        
        measurements = []
        for text, box in results:
            # Filter by confidence (if available in your OCR implementation)
            # Calculate centroid of bounding box
            centroid_x = sum(point[0] for point in box) / len(box)
            centroid_y = sum(point[1] for point in box) / len(box)
            
            measurements.append({
                'text': text,
                'position': (centroid_x, centroid_y),
                'bounding_box': box.tolist(),
                'confidence': 1.0  # keras_ocr doesn't provide confidence by default
            })
        
        return measurements


class BlueprintAnalysisService:
    """High-level service for blueprint analysis with injected dependencies.
    
    This demonstrates how to compose services with dependency injection.
    """
    
    def __init__(self, ocr_service: Optional[OCRService] = None):
        """Initialize with optional OCR service injection.
        
        Args:
            ocr_service: OCR service instance. If None, creates new one.
        """
        self._ocr_service = ocr_service or OCRService()
    
    def analyze_blueprint(self, image, extract_measurements: bool = True) -> dict:
        """Analyze blueprint image and extract information.
        
        Args:
            image: Blueprint image to analyze
            extract_measurements: Whether to extract measurements
            
        Returns:
            Dictionary with analysis results
        """
        results = {
            'measurements': [],
            'text_regions': []
        }
        
        if extract_measurements:
            results['measurements'] = self._ocr_service.extract_measurements(image)
        else:
            raw_text = self._ocr_service.extract_text_from_images([image])[0]
            results['text_regions'] = [
                {'text': text, 'box': box.tolist()} 
                for text, box in raw_text
            ]
        
        return results


# Example usage demonstrating the patterns:
def example_usage():
    """Example demonstrating singleton and DI patterns."""
    
    # Option 1: Use default singleton pipeline
    service1 = OCRService()
    
    # Option 2: Explicitly get singleton and inject it
    pipeline = get_ocr_pipeline()
    service2 = OCRService(pipeline=pipeline)
    
    # Option 3: Inject at higher level
    analysis_service = BlueprintAnalysisService(ocr_service=service1)
    
    # All services share the same underlying keras_ocr pipeline instance
    # Heavy initialization only happens once, on first use
