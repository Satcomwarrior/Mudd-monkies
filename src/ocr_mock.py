"""Mock OCR Pipeline for testing."""

from typing import List
import numpy as np


class MockOCRPipeline:
    """Mock OCR pipeline returning deterministic test data."""

    def __init__(self, test_data=None):
        self._test_data = test_data or [
            [('10.5m', np.array([[10, 10], [50, 10], [50, 30], [10, 30]], dtype=np.float32)),
             ('5.2m', np.array([[100, 50], [135, 50], [135, 70], [100, 70]], dtype=np.float32))],
        ]
        self._call_count = 0

    def recognize(self, images: List) -> List:
        """Return deterministic test data."""
        self._call_count += 1
        results = []
        for i, _ in enumerate(images):
            data_index = i % len(self._test_data)
            results.append(self._test_data[data_index])
        return results
