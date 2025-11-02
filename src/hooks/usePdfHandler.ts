import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PageMeasurements, Point, MeasurementUnit, Tool } from '@/types/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const usePdfHandler = () => {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [measurements, setMeasurements] = useState<PageMeasurements>({});
  const [measurementUnit, setMeasurementUnit] = useState<MeasurementUnit>('ft');
  const [tool, setTool] = useState<Tool>('measure');
  const [isSettingScale, setIsSettingScale] = useState(false);
  const [scaleReference, setScaleReference] = useState<Point | null>(null);
  const [pixelsPerUnit, setPixelsPerUnit] = useState<number | null>(null);
  const [actualLength, setActualLength] = useState('');
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  const [areaPoints, setAreaPoints] = useState<Point[]>([]);
  const [currentMeasurement, setCurrentMeasurement] = useState<Point[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const loadPdf = useCallback(async (file: File) => {
    const fileReader = new FileReader();
    fileReader.onload = async function() {
      const typedarray = new Uint8Array(this.result as ArrayBuffer);
      const loadedPdf = await pdfjsLib.getDocument(typedarray).promise;
      setPdf(loadedPdf);
      setMeasurements({});
      setCurrentPage(1);
    };
    fileReader.readAsArrayBuffer(file);
  }, []);

  const renderPdfPage = useCallback(async () => {
    if (!pdf || !pdfCanvasRef.current) return;

    const page = await pdf.getPage(currentPage);
    const canvas = pdfCanvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (annotationCanvasRef.current) {
      annotationCanvasRef.current.width = viewport.width;
      annotationCanvasRef.current.height = viewport.height;
      setCanvasSize({ width: viewport.width, height: viewport.height });
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    }).promise;
  }, [pdf, currentPage, scale]);

  const calculateDistance = useCallback((points: Point[]) => {
    if (points.length !== 2 || !pixelsPerUnit) return null;
    const [p1, p2] = points;
    const pixels = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    return (pixels / pixelsPerUnit).toFixed(2);
  }, [pixelsPerUnit]);

  const calculateArea = useCallback((points: Point[]) => {
    if (points.length < 3 || !pixelsPerUnit) return null;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    return ((area / Math.pow(pixelsPerUnit, 2))).toFixed(2);
  }, [pixelsPerUnit]);

  const drawMeasurement = useCallback((points: Point[], isPreview = false, type: 'linear' | 'area' = 'linear') => {
    if (!annotationCanvasRef.current) return;
    const context = annotationCanvasRef.current.getContext('2d');
    if (!context) return;

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.forEach((point, i) => {
      if (i > 0) context.lineTo(point.x, point.y);
    });

    if (type === 'area' && !isPreview) {
      context.closePath();
    }

    context.strokeStyle = type === 'linear' ? 
      (isPreview ? '#FF000080' : '#FF0000') : 
      (isPreview ? '#0000FF80' : '#0000FF');
    context.lineWidth = 2;
    context.stroke();

    if (pixelsPerUnit) {
      const value = type === 'linear' ? calculateDistance(points) : calculateArea(points);
      if (value) {
        const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        context.font = '14px Arial';
        context.fillStyle = type === 'linear' ? 
          (isPreview ? '#FF000080' : '#FF0000') : 
          (isPreview ? '#0000FF80' : '#0000FF');
        context.fillText(
          `${value} ${measurementUnit}${type === 'area' ? '²' : ''}`, 
          centerX, 
          centerY
        );
      }
    }
  }, [calculateArea, calculateDistance, measurementUnit, pixelsPerUnit]);

  const renderAnnotations = useCallback(() => {
    if (!annotationCanvasRef.current) return;
    const context = annotationCanvasRef.current.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw completed measurements
    const pageMeasurements = measurements[currentPage] || [];
    pageMeasurements.forEach(m => {
      drawMeasurement(m.points, false, m.type);
    });

    // Draw current measurement preview
    if (currentMeasurement.length > 0) {
      drawMeasurement(currentMeasurement, true, tool as 'area' | 'linear');
    }
  }, [measurements, currentPage, currentMeasurement, tool, canvasSize, drawMeasurement]);

  useEffect(() => {
    if (pdf) {
      renderPdfPage();
    }
  }, [pdf, renderPdfPage]);

  useEffect(() => {
    if (canvasSize.width && canvasSize.height) {
      renderAnnotations();
    }
  }, [canvasSize, renderAnnotations]);

  return {
    pdfCanvasRef,
    annotationCanvasRef,
    pdf,
    currentPage,
    setCurrentPage,
    scale,
    setScale,
    measurements,
    setMeasurements,
    measurementUnit,
    setMeasurementUnit,
    tool,
    setTool,
    isSettingScale,
    setIsSettingScale,
    scaleReference,
    setScaleReference,
    pixelsPerUnit,
    setPixelsPerUnit,
    actualLength,
    setActualLength,
    measureStart,
    setMeasureStart,
    areaPoints,
    setAreaPoints,
    currentMeasurement,
    setCurrentMeasurement,
    loadPdf,
    calculateDistance,
    calculateArea,
    renderAnnotations,
  };
}; 