'use client';

import { ChangeEvent, MouseEvent, useCallback, useMemo, useState } from 'react';
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
import { Ruler, Move } from 'lucide-react';
import { AiGuidancePanel } from '@/components/AiGuidancePanel';
import type { GuidanceResponse, PromptExchange } from '@/lib/constructConnect';

type GuidanceContext = {
  documentName?: string;
  projectId?: string;
  lastMeasurement?: {
    id: string;
    type: 'linear' | 'area';
    value: number;
    unit: MeasurementUnit;
    page: number;
  };
  currentPage?: number;
};

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

  const [guidance, setGuidance] = useState<GuidanceResponse | null>(null);
  const [promptHistory, setPromptHistory] = useState<PromptExchange[]>([]);
  const [guidanceContext, setGuidanceContext] = useState<GuidanceContext>({});
  const [isGuidanceLoading, setIsGuidanceLoading] = useState(false);
  const [guidanceError, setGuidanceError] = useState<string | null>(null);

  const measurementUnitLabel = useMemo(() => (
    measurementUnit === 'ft'
      ? 'ft'
      : measurementUnit === 'm'
        ? 'm'
        : 'in'
  ), [measurementUnit]);

  const requestGuidance = useCallback(async (
    prompt: string,
    contextOverrides?: Record<string, unknown>
  ) => {
    const overrides = contextOverrides ?? {};
    const mergedContext = {
      ...guidanceContext,
      ...overrides,
      currentPage,
    };

    if (Object.keys(overrides).length > 0) {
      setGuidanceContext((prev) => ({
        ...prev,
        ...overrides,
        currentPage,
      }));
    } else {
      setGuidanceContext((prev) => ({
        ...prev,
        currentPage,
      }));
    }

    const userTurn: PromptExchange = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
      context: mergedContext,
    };

    let historySnapshot: PromptExchange[] = [];

    setPromptHistory((prev) => {
      historySnapshot = [...prev, userTurn];
      return historySnapshot;
    });

    setIsGuidanceLoading(true);
    setGuidanceError(null);

    try {
      const response = await fetch('/api/guidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          context: mergedContext,
          history: historySnapshot,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.error ?? 'Unable to fetch AI guidance.';
        const assistantError: PromptExchange = {
          role: 'assistant',
          content: message,
          timestamp: new Date().toISOString(),
          error: message,
        };
        setPromptHistory((prev) => [...prev, assistantError]);
        setGuidanceError(message);
        return;
      }

      const guidancePayload = data?.guidance as GuidanceResponse | undefined;
      if (guidancePayload) {
        setGuidance(guidancePayload);
      }

      const assistantTurn: PromptExchange = {
        role: 'assistant',
        content: guidancePayload?.message ?? 'No guidance provided.',
        timestamp: new Date().toISOString(),
        context: guidancePayload,
      };

      setPromptHistory((prev) => [...prev, assistantTurn]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch AI guidance.';
      setGuidanceError(message);
      const assistantError: PromptExchange = {
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString(),
        error: message,
      };
      setPromptHistory((prev) => [...prev, assistantError]);
    } finally {
      setIsGuidanceLoading(false);
    }
  }, [currentPage, guidanceContext]);

  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadPdf(file);
      void requestGuidance(
        `Provide an overview and recommended review steps for the plan set "${file.name}".`,
        {
          trigger: 'document_opened',
          documentName: file.name,
        }
      );
    }
  }, [loadPdf, requestGuidance]);

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

        setMeasurements({
          ...measurements,
          [currentPage]: [
            ...(measurements[currentPage] || []),
            newMeasurement
          ]
        });
        setMeasureStart(null);
        setCurrentMeasurement([]);

        const measurementSummary = `Measured ${newMeasurement.value} ${measurementUnitLabel}${
          newMeasurement.type === 'area' ? '²' : ''
        } on page ${currentPage}.`;

        void requestGuidance(
          `Provide feedback on the latest measurement. ${measurementSummary}`,
          {
            trigger: 'measurement_completed',
            measurement: {
              id: newMeasurement.id,
              type: newMeasurement.type,
              value: newMeasurement.value,
              unit: measurementUnit,
              page: currentPage,
            },
          }
        );
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

        setMeasurements({
          ...measurements,
          [currentPage]: [
            ...(measurements[currentPage] || []),
            newMeasurement
          ]
        });
        setAreaPoints([]);
        setCurrentMeasurement([]);

        const measurementSummary = `Calculated an area of ${newMeasurement.value} ${measurementUnitLabel}² on page ${currentPage}.`;

        void requestGuidance(
          `Assess the new area measurement. ${measurementSummary}`,
          {
            trigger: 'measurement_completed',
            measurement: {
              id: newMeasurement.id,
              type: newMeasurement.type,
              value: newMeasurement.value,
              unit: measurementUnit,
              page: currentPage,
            },
          }
        );
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

  return (
    <div className="flex flex-col lg:flex-row w-full max-w-7xl mx-auto p-4 gap-4">
      <div className="flex-1 flex flex-col items-center space-y-4">
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
              disabled={!actualLength}
              variant={isSettingScale ? "secondary" : "outline"}
            >
              Set Scale
            </Button>
          </div>

          <div className="flex items-center gap-2">
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
              onClick={() => {
                setMeasurements({});
                setMeasureStart(null);
                setAreaPoints([]);
                setCurrentMeasurement([]);
              }}
              variant="destructive"
            >
              Clear All
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

        <div className="w-full bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Measurements (Page {currentPage})</h3>
          <div className="space-y-2">
            {(measurements[currentPage] || []).map((m, i) => (
              <div
                key={m.id}
                className="p-2 border-b border-gray-100 last:border-0 text-sm text-gray-600"
              >
                {m.type === 'linear' ? (
                  <span>Distance {i + 1}: {m.value} {measurementUnit}</span>
                ) : (
                  <span>Area {i + 1}: {m.value} {measurementUnit}²</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {isSettingScale && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow">
            Click two points on the drawing to set the scale reference
          </div>
        )}
      </div>

      <AiGuidancePanel
        guidance={guidance}
        history={promptHistory}
        onSendPrompt={(prompt) => requestGuidance(prompt)}
        isLoading={isGuidanceLoading}
        error={guidanceError}
      />
    </div>
  );
}
