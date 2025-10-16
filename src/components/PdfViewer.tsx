import {
  ChangeEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePdfHandler } from '@/hooks/usePdfHandler';
import { MeasurementUnit, Point } from '@/types/pdf';
import { Ruler, Move, Trash2, Undo2, Eraser } from 'lucide-react';
import { AiGuidancePanel } from '@/components/AiGuidancePanel';
import type { ConstructGuidanceMessage } from '@/types/guidance';
import {
  buildAlgorithmInsights,
  insightsToPayload,
  type AlgorithmicInsightPayloadItem,
} from '@/lib/measurementInsights';

export function PdfViewer() {
  const {
    pdfCanvasRef,
    annotationCanvasRef,
    pdf,
    currentPage,
    setCurrentPage,
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
    setCurrentMeasurement,
    loadPdf,
    calculateDistance,
    calculateArea,
  } = usePdfHandler();

  const [guidanceMessages, setGuidanceMessages] = useState<ConstructGuidanceMessage[]>([]);
  const [isGuidanceLoading, setIsGuidanceLoading] = useState(false);
  const [guidanceError, setGuidanceError] = useState<string | null>(null);
  const guidanceHistoryRef = useRef<ConstructGuidanceMessage[]>([]);

  useEffect(() => {
    guidanceHistoryRef.current = guidanceMessages;
  }, [guidanceMessages]);

  const pageMeasurements = useMemo(
    () => measurements[currentPage] || [],
    [measurements, currentPage]
  );

  const measurementCount = pageMeasurements.length;

  const { totalLinear, totalArea } = useMemo(() => {
    return pageMeasurements.reduce(
      (totals, measurement) => {
        if (!Number.isFinite(measurement.value)) {
          return totals;
        }

        if (measurement.type === 'linear') {
          totals.totalLinear += measurement.value;
        } else if (measurement.type === 'area') {
          totals.totalArea += measurement.value;
        }

        return totals;
      },
      { totalLinear: 0, totalArea: 0 }
    );
  }, [pageMeasurements]);

  const isScaleCalibrated = useMemo(() => Boolean(pixelsPerUnit), [pixelsPerUnit]);

  const measurementInsights = useMemo(
    () =>
      buildAlgorithmInsights({
        measurements: pageMeasurements,
        unit: measurementUnit,
        isScaleCalibrated,
      }),
    [pageMeasurements, measurementUnit, isScaleCalibrated]
  );

  const measurementInsightsPayload = useMemo(
    () => insightsToPayload(measurementInsights),
    [measurementInsights]
  );

  const isActualLengthValid = useMemo(() => {
    const parsed = parseFloat(actualLength);
    return !Number.isNaN(parsed) && parsed > 0;
  }, [actualLength]);

  const requestGuidance = useCallback(
    async (
      event: 'pdf_opened' | 'measurement_completed' | 'custom_prompt',
      payload: Record<string, unknown>,
      overrideInsights?: AlgorithmicInsightPayloadItem[]
    ) => {
      if (!pdf) return;

      setIsGuidanceLoading(true);
      setGuidanceError(null);

      try {
        const response = await fetch('/api/guidance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event,
            payload: {
              ...payload,
              algorithmicInsights: overrideInsights ?? measurementInsightsPayload,
            },
            history: guidanceHistoryRef.current,
          }),
        });

        const responseText = await response.text();
        let parsed: unknown = null;

        if (responseText) {
          try {
            parsed = JSON.parse(responseText);
          } catch (jsonError) {
            parsed = { error: responseText, details: String(jsonError) };
          }
        }

        if (!response.ok) {
          const errorMessage =
            typeof parsed === 'object' && parsed && 'error' in parsed
              ? String((parsed as Record<string, unknown>).error)
              : response.statusText;
          throw new Error(errorMessage || 'Unable to fetch ConstructConnect guidance.');
        }

        const data = parsed as { messages?: ConstructGuidanceMessage[] };
        if (Array.isArray(data?.messages)) {
          setGuidanceMessages((prev) => {
            const merged = [...prev];
            data.messages.forEach((message) => {
              if (!merged.find((existing) => existing.id === message.id)) {
                merged.push(message);
              }
            });
            return merged;
          });
        }
      } catch (error) {
        setGuidanceError(
          error instanceof Error
            ? error.message
            : 'Unexpected error while fetching ConstructConnect guidance.'
        );
      } finally {
        setIsGuidanceLoading(false);
      }
    },
    [pdf, measurementInsightsPayload]
  );

  const handleRefreshGuidance = useCallback(() => {
    if (!pdf) return;
    void requestGuidance('custom_prompt', {
      reason: 'manual_refresh',
      page: currentPage,
      measurementCount,
      unit: measurementUnit,
    });
  }, [currentPage, measurementCount, measurementUnit, pdf, requestGuidance]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGuidanceMessages([]);
      setGuidanceError(null);
      loadPdf(file);
      setPixelsPerUnit(null);
      setScaleReference(null);
      setIsSettingScale(false);
      setMeasureStart(null);
      setAreaPoints([]);
      setCurrentMeasurement([]);
      setActualLength('');
    }
  };

  const handleRemoveMeasurement = useCallback(
    (measurementId: string) => {
      setMeasurements((prev) => {
        const currentPageMeasurements = prev[currentPage] || [];
        const updatedPageMeasurements = currentPageMeasurements.filter(
          (measurement) => measurement.id !== measurementId
        );

        if (updatedPageMeasurements.length === currentPageMeasurements.length) {
          return prev;
        }

        return {
          ...prev,
          [currentPage]: updatedPageMeasurements,
        };
      });
    },
    [currentPage, setMeasurements]
  );

  const handleUndoMeasurement = useCallback(() => {
    setMeasurements((prev) => {
      const currentPageMeasurements = prev[currentPage] || [];
      if (currentPageMeasurements.length === 0) {
        return prev;
      }

      const updatedPageMeasurements = currentPageMeasurements.slice(0, -1);
      return {
        ...prev,
        [currentPage]: updatedPageMeasurements,
      };
    });
    setMeasureStart(null);
    setAreaPoints([]);
    setCurrentMeasurement([]);
  }, [currentPage, setMeasurements, setMeasureStart, setAreaPoints, setCurrentMeasurement]);

  const handleClearCurrentPage = useCallback(() => {
    setMeasurements((prev) => {
      const currentPageMeasurements = prev[currentPage] || [];
      if (currentPageMeasurements.length === 0) {
        return prev;
      }

      return {
        ...prev,
        [currentPage]: [],
      };
    });
    setMeasureStart(null);
    setAreaPoints([]);
    setCurrentMeasurement([]);
  }, [currentPage, setMeasurements, setMeasureStart, setAreaPoints, setCurrentMeasurement]);

  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!annotationCanvasRef.current) return;

    const rect = annotationCanvasRef.current.getBoundingClientRect();
    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    if (isSettingScale) {
      if (!scaleReference) {
        setScaleReference(point);
      } else {
        const distance = Math.sqrt(
          Math.pow(point.x - scaleReference.x, 2) + 
          Math.pow(point.y - scaleReference.y, 2)
        );
        setPixelsPerUnit(distance / parseFloat(actualLength));
        setIsSettingScale(false);
        setScaleReference(null);
      }
      return;
    }

    if (tool === 'measure') {
      if (!measureStart) {
        setMeasureStart(point);
        setCurrentMeasurement([point]);
      } else {
        const newMeasurement = {
          id: Date.now().toString(),
          type: 'linear' as const,
          points: [measureStart, point],
          value: parseFloat(calculateDistance([measureStart, point]) || '0')
        };

        const nextPageMeasurements = [...pageMeasurements, newMeasurement];
        const nextInsights = insightsToPayload(
          buildAlgorithmInsights({
            measurements: nextPageMeasurements,
            unit: measurementUnit,
            isScaleCalibrated,
          })
        );

        setMeasurements((prev) => {
          const currentPageMeasurements = prev[currentPage] || [];
          return {
            ...prev,
            [currentPage]: [...currentPageMeasurements, newMeasurement],
          };
        });
        setMeasureStart(null);
        setCurrentMeasurement([]);
        void requestGuidance('measurement_completed', {
          page: currentPage,
          measurement: newMeasurement,
          unit: measurementUnit,
        }, nextInsights);
      }
    } else if (tool === 'area') {
      if (
        areaPoints.length > 2 &&
        Math.abs(point.x - areaPoints[0].x) < 10 &&
        Math.abs(point.y - areaPoints[0].y) < 10
      ) {
        const newMeasurement = {
          id: Date.now().toString(),
          type: 'area' as const,
          points: areaPoints,
          value: parseFloat(calculateArea(areaPoints) || '0')
        };

        const nextPageMeasurements = [...pageMeasurements, newMeasurement];
        const nextInsights = insightsToPayload(
          buildAlgorithmInsights({
            measurements: nextPageMeasurements,
            unit: measurementUnit,
            isScaleCalibrated,
          })
        );

        setMeasurements((prev) => {
          const currentPageMeasurements = prev[currentPage] || [];
          return {
            ...prev,
            [currentPage]: [...currentPageMeasurements, newMeasurement],
          };
        });
        setAreaPoints([]);
        setCurrentMeasurement([]);
        void requestGuidance('measurement_completed', {
          page: currentPage,
          measurement: newMeasurement,
          unit: measurementUnit,
        }, nextInsights);
      } else {
        const newPoints = [...areaPoints, point];
        setAreaPoints(newPoints);
        setCurrentMeasurement(newPoints);
      }
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!annotationCanvasRef.current) return;
    if (!measureStart && areaPoints.length === 0) return;

    const rect = annotationCanvasRef.current.getBoundingClientRect();
    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    if (tool === 'measure' && measureStart) {
      setCurrentMeasurement([measureStart, point]);
    } else if (tool === 'area' && areaPoints.length > 0) {
      setCurrentMeasurement([...areaPoints, point]);
    }
  };

  useEffect(() => {
    if (!pdf) return;
    void requestGuidance('pdf_opened', {
      page: currentPage,
      measurementCount,
      unit: measurementUnit,
    });
  }, [pdf, currentPage, measurementCount, measurementUnit, requestGuidance]);

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4 w-full bg-white p-4 rounded-lg shadow">
        <Input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="max-w-xs"
        />
        
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Enter length"
            value={actualLength}
            onChange={(e) => setActualLength(e.target.value)}
            className="w-32"
          />
          <Select
            value={measurementUnit}
            onValueChange={(value) => setMeasurementUnit(value as MeasurementUnit)}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ft">Feet</SelectItem>
              <SelectItem value="m">Meters</SelectItem>
              <SelectItem value="in">Inches</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setIsSettingScale(true)}
            disabled={!isActualLengthValid}
            variant={isSettingScale ? "secondary" : "outline"}
          >
            Set Scale
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setTool('measure')}
            variant={tool === 'measure' ? "default" : "outline"}
          >
            <Ruler className="w-4 h-4 mr-2" />
            Measure
          </Button>
          <Button
            onClick={() => setTool('area')}
            variant={tool === 'area' ? "default" : "outline"}
          >
            <Move className="w-4 h-4 mr-2" />
            Area
          </Button>
          <Button
            onClick={handleUndoMeasurement}
            variant="outline"
            disabled={pageMeasurements.length === 0}
          >
            <Undo2 className="w-4 h-4 mr-2" />
            Undo Last
          </Button>
          <Button
            onClick={handleClearCurrentPage}
            variant="destructive"
            disabled={pageMeasurements.length === 0}
          >
            <Eraser className="w-4 h-4 mr-2" />
            Clear Page
          </Button>
        </div>

        {pdf && (
          <div className="flex items-center gap-2 ml-auto">
            <Button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {pdf.numPages}
            </span>
            <Button
              onClick={() => setCurrentPage(Math.min(pdf.numPages, currentPage + 1))}
              disabled={currentPage === pdf.numPages}
              variant="outline"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <div className="relative inline-block">
        <canvas
          ref={pdfCanvasRef}
          className="border-2 border-gray-300 rounded-lg shadow-lg"
        />
        <canvas
          ref={annotationCanvasRef}
          className="absolute top-0 left-0 cursor-crosshair"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
        />
      </div>

      <div className="w-full flex flex-col lg:flex-row gap-4">
        <div className="flex-1 bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-lg font-semibold">Measurements (Page {currentPage})</h3>
            <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
                <span className="font-semibold">{measurementCount}</span>
                <span>records</span>
              </div>
              <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
                <span className="font-semibold">{totalLinear.toFixed(2)}</span>
                <span>{measurementUnit}</span>
              </div>
              <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
                <span className="font-semibold">{totalArea.toFixed(2)}</span>
                <span>{measurementUnit}²</span>
              </div>
            </div>
          </div>
          {!pdf && (
            <p className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              Upload a PDF blueprint above to start measuring distances and areas.
            </p>
          )}
          {pdf && !isScaleCalibrated && (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 mb-3">
              Set the scale by entering a known length and selecting two points on the drawing to unlock accurate measurements.
            </p>
          )}
          {pageMeasurements.length === 0 && pdf && (
            <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              Select the Measure or Area tool, then click on the drawing to capture your first measurement.
            </p>
          )}
          <div className="space-y-2">
            {pageMeasurements.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700"
              >
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {m.type === 'linear' ? `Distance ${i + 1}` : `Area ${i + 1}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {m.value.toFixed(2)} {measurementUnit}
                    {m.type === 'area' ? '²' : ''}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${m.type} measurement ${i + 1}`}
                  onClick={() => handleRemoveMeasurement(m.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <AiGuidancePanel
          messages={guidanceMessages}
          isLoading={isGuidanceLoading}
          error={guidanceError}
          onRefresh={handleRefreshGuidance}
          insights={measurementInsights}
        />
      </div>

      {isSettingScale && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow">
          Click two points on the drawing to set the scale reference
        </div>
      )}
    </div>
  );
} 