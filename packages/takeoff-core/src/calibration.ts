import { distance } from './geometry.ts';
import type { Point } from './types.ts';
import {
  assertFinitePositive,
  convertLength,
  type LinearUnit,
} from './units.ts';

export interface Calibration {
  id: string;
  sheetId: string;
  pointA: Point;
  pointB: Point;
  knownDistance: number;
  unit: LinearUnit;
  scope?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  source: 'manual' | 'detected' | 'imported';
  reviewed: boolean;
}

export function pointsPerUnit(calibration: Calibration): number {
  assertFinitePositive(calibration.knownDistance, 'knownDistance');
  const sheetDistance = distance(calibration.pointA, calibration.pointB);
  assertFinitePositive(sheetDistance, 'calibration point distance');
  return sheetDistance / calibration.knownDistance;
}

export function sheetLengthToReal(
  sheetLength: number,
  calibration: Calibration,
  outputUnit: LinearUnit = calibration.unit,
): number {
  if (!Number.isFinite(sheetLength) || sheetLength < 0) {
    throw new Error('sheetLength must be a finite non-negative number');
  }
  const inCalibrationUnit = sheetLength / pointsPerUnit(calibration);
  return convertLength(inCalibrationUnit, calibration.unit, outputUnit);
}

export function sheetAreaToReal(
  sheetArea: number,
  calibration: Calibration,
  outputUnit: LinearUnit = calibration.unit,
): number {
  if (!Number.isFinite(sheetArea) || sheetArea < 0) {
    throw new Error('sheetArea must be a finite non-negative number');
  }
  const factor = pointsPerUnit(calibration);
  const areaInCalibrationUnit = sheetArea / (factor * factor);

  const oneUnitInOutput = convertLength(1, calibration.unit, outputUnit);
  return areaInCalibrationUnit * oneUnitInOutput * oneUnitInOutput;
}
