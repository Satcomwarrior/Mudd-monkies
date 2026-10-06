import {
  circleArea,
  distance,
  polygonArea,
  polylineLength,
  rectangleArea,
} from './geometry.ts';
import {
  sheetAreaToReal,
  sheetLengthToReal,
  type Calibration,
} from './calibration.ts';
import type {
  AnnotationGeometry,
  QuantityDimension,
} from './types.ts';
import {
  assertFinitePositive,
  convertLength,
  type LinearUnit,
} from './units.ts';

export interface Quantity {
  dimension: QuantityDimension;
  value: number;
  unit: LinearUnit | 'ea';
}

export function quantityFromGeometry(
  geometry: AnnotationGeometry,
  calibration: Calibration | undefined,
  outputUnit: LinearUnit = calibration?.unit ?? 'ft',
): Quantity {
  switch (geometry.kind) {
    case 'count':
      return { dimension: 'count', value: 1, unit: 'ea' };

    case 'line': {
      if (!calibration) throw new Error('calibration is required for length');
      return {
        dimension: 'length',
        value: sheetLengthToReal(
          distance(geometry.start, geometry.end),
          calibration,
          outputUnit,
        ),
        unit: outputUnit,
      };
    }

    case 'polyline': {
      if (!calibration) throw new Error('calibration is required for length');
      return {
        dimension: 'length',
        value: sheetLengthToReal(
          polylineLength(geometry.points),
          calibration,
          outputUnit,
        ),
        unit: outputUnit,
      };
    }

    case 'polygon': {
      if (!calibration) throw new Error('calibration is required for area');
      return {
        dimension: 'area',
        value: sheetAreaToReal(
          polygonArea(geometry.points),
          calibration,
          outputUnit,
        ),
        unit: outputUnit,
      };
    }

    case 'rectangle': {
      if (!calibration) throw new Error('calibration is required for area');
      return {
        dimension: 'area',
        value: sheetAreaToReal(
          rectangleArea(geometry.width, geometry.height),
          calibration,
          outputUnit,
        ),
        unit: outputUnit,
      };
    }

    case 'circle': {
      if (!calibration) throw new Error('calibration is required for area');
      return {
        dimension: 'area',
        value: sheetAreaToReal(
          circleArea(geometry.radius),
          calibration,
          outputUnit,
        ),
        unit: outputUnit,
      };
    }
  }
}

export function volumeFromArea(
  area: Quantity,
  depth: number,
  depthUnit: LinearUnit,
): Quantity {
  if (area.dimension !== 'area' || area.unit === 'ea') {
    throw new Error('volume requires an area quantity');
  }
  assertFinitePositive(depth, 'depth');
  const convertedDepth = convertLength(depth, depthUnit, area.unit);
  return {
    dimension: 'volume',
    value: area.value * convertedDepth,
    unit: area.unit,
  };
}

export function applyWaste(quantity: Quantity, wastePercent: number): Quantity {
  if (!Number.isFinite(wastePercent) || wastePercent < 0) {
    throw new Error('wastePercent must be a finite non-negative number');
  }
  return {
    ...quantity,
    value: quantity.value * (1 + wastePercent / 100),
  };
}
