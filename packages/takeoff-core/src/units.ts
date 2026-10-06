export type LinearUnit = 'in' | 'ft' | 'yd' | 'mm' | 'cm' | 'm';

const METERS_PER_UNIT: Record<LinearUnit, number> = {
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mm: 0.001,
  cm: 0.01,
  m: 1,
};

export function assertFinitePositive(value: number, label = 'value'): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite positive number`);
  }
}

export function convertLength(
  value: number,
  from: LinearUnit,
  to: LinearUnit,
): number {
  if (!Number.isFinite(value)) {
    throw new Error('length must be finite');
  }
  return (value * METERS_PER_UNIT[from]) / METERS_PER_UNIT[to];
}

export function convertArea(
  value: number,
  from: LinearUnit,
  to: LinearUnit,
): number {
  if (!Number.isFinite(value)) {
    throw new Error('area must be finite');
  }
  const ratio = METERS_PER_UNIT[from] / METERS_PER_UNIT[to];
  return value * ratio * ratio;
}

export function convertVolume(
  value: number,
  from: LinearUnit,
  to: LinearUnit,
): number {
  if (!Number.isFinite(value)) {
    throw new Error('volume must be finite');
  }
  const ratio = METERS_PER_UNIT[from] / METERS_PER_UNIT[to];
  return value * ratio * ratio * ratio;
}
