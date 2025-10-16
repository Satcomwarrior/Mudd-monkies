import type { Measurement, MeasurementUnit } from '@/types/pdf';

export type InsightTone = 'info' | 'warning' | 'success';

export interface AlgorithmicInsight {
  id: string;
  title: string;
  value: string;
  helperText?: string;
  tone?: InsightTone;
}

export interface AlgorithmicInsightPayloadItem {
  id: string;
  title: string;
  value: string;
  helperText?: string;
}

interface BuildAlgorithmInsightsParams {
  measurements: Measurement[];
  unit: MeasurementUnit;
  isScaleCalibrated: boolean;
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

const areaFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

function formatLength(value: number, unit: MeasurementUnit) {
  return `${numberFormatter.format(value)} ${unit}`;
}

function formatArea(value: number, unit: MeasurementUnit) {
  return `${areaFormatter.format(value)} ${unit}²`;
}

function calculateStandardDeviation(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance =
    values.reduce((total, value) => total + Math.pow(value - mean, 2), 0) / values.length;

  return Math.sqrt(variance);
}

function calculateCoefficientOfVariation(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  if (mean === 0) {
    return 0;
  }

  return (calculateStandardDeviation(values) / mean) * 100;
}

export function buildAlgorithmInsights({
  measurements,
  unit,
  isScaleCalibrated,
}: BuildAlgorithmInsightsParams): AlgorithmicInsight[] {
  const insights: AlgorithmicInsight[] = [];

  insights.push(
    isScaleCalibrated
      ? {
          id: 'scale-status',
          title: 'Scale calibrated',
          value: 'Measurements reflect the configured real-world units.',
          tone: 'success',
        }
      : {
          id: 'scale-status',
          title: 'Scale pending',
          value: 'Set a scale reference to convert pixel distances to site units.',
          helperText: 'Enter a known dimension, click "Set Scale", and pick two reference points.',
          tone: 'warning',
        }
  );

  if (measurements.length === 0) {
    return insights;
  }

  const linearMeasurements = measurements.filter((measurement) => measurement.type === 'linear');
  const areaMeasurements = measurements.filter((measurement) => measurement.type === 'area');

  const totalLinear = linearMeasurements.reduce((total, measurement) => total + measurement.value, 0);
  const totalArea = areaMeasurements.reduce((total, measurement) => total + measurement.value, 0);

  insights.push({
    id: 'measurement-count',
    title: 'Active measurements',
    value: `${measurements.length} total (${linearMeasurements.length} linear, ${areaMeasurements.length} area)`,
    tone: 'info',
  });

  if (linearMeasurements.length > 0) {
    const longestLinear = linearMeasurements.reduce((max, measurement) =>
      measurement.value > max.value ? measurement : max
    );
    const shortestLinear = linearMeasurements.reduce((min, measurement) =>
      measurement.value < min.value ? measurement : min
    );
    const linearValues = linearMeasurements.map((measurement) => measurement.value);
    const averageLinear = totalLinear / linearMeasurements.length;
    const linearCv = calculateCoefficientOfVariation(linearValues);

    insights.push({
      id: 'linear-total',
      title: 'Total linear footage',
      value: formatLength(totalLinear, unit),
      helperText: `Average run length: ${formatLength(averageLinear, unit)}`,
      tone: 'info',
    });

    insights.push({
      id: 'linear-extremes',
      title: 'Linear spread',
      value: `${formatLength(shortestLinear.value, unit)} – ${formatLength(
        longestLinear.value,
        unit
      )}`,
      helperText:
        linearCv > 0
          ? `Coefficient of variation: ${numberFormatter.format(linearCv)}%`
          : undefined,
      tone: 'info',
    });
  }

  if (areaMeasurements.length > 0) {
    const largestArea = areaMeasurements.reduce((max, measurement) =>
      measurement.value > max.value ? measurement : max
    );
    const smallestArea = areaMeasurements.reduce((min, measurement) =>
      measurement.value < min.value ? measurement : min
    );
    const areaValues = areaMeasurements.map((measurement) => measurement.value);
    const averageArea = totalArea / areaMeasurements.length;
    const areaCv = calculateCoefficientOfVariation(areaValues);

    insights.push({
      id: 'area-total',
      title: 'Total measured area',
      value: formatArea(totalArea, unit),
      helperText: `Average footprint: ${formatArea(averageArea, unit)}`,
      tone: 'info',
    });

    insights.push({
      id: 'area-extremes',
      title: 'Area distribution',
      value: `${formatArea(smallestArea.value, unit)} – ${formatArea(largestArea.value, unit)}`,
      helperText:
        areaCv > 0 ? `Coefficient of variation: ${numberFormatter.format(areaCv)}%` : undefined,
      tone: 'info',
    });

    if (totalArea > 0) {
      const largestContribution = (largestArea.value / totalArea) * 100;
      insights.push({
        id: 'area-dominance',
        title: 'Largest area dominance',
        value: `${numberFormatter.format(largestContribution)}% of measured area`,
        helperText:
          largestContribution > 60
            ? 'Consider splitting this region to capture build phases or spec differences.'
            : 'Coverage is balanced across captured areas.',
        tone: largestContribution > 60 ? 'warning' : 'info',
      });
    }
  }

  return insights;
}

export function insightsToPayload(
  insights: AlgorithmicInsight[]
): AlgorithmicInsightPayloadItem[] {
  return insights.map(({ id, title, value, helperText }) => ({
    id,
    title,
    value,
    helperText,
  }));
}
