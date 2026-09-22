import type { Point } from './types.ts';

function assertPoint(point: Point, label: string): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${label} must contain finite coordinates`);
  }
}

export function distance(a: Point, b: Point): number {
  assertPoint(a, 'point a');
  assertPoint(b, 'point b');
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function polylineLength(points: readonly Point[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distance(points[i - 1], points[i]);
  }
  return total;
}

export function polygonArea(points: readonly Point[]): number {
  if (points.length < 3) return 0;
  points.forEach((point, index) => assertPoint(point, `point ${index}`));

  let doubled = 0;
  for (let i = 0; i < points.length; i += 1) {
    const j = (i + 1) % points.length;
    doubled += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(doubled) / 2;
}

export function rectangleArea(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error('rectangle dimensions must be finite');
  }
  return Math.abs(width * height);
}

export function circleArea(radius: number): number {
  if (!Number.isFinite(radius) || radius < 0) {
    throw new Error('radius must be a finite non-negative number');
  }
  return Math.PI * radius * radius;
}

export function arcLength(radius: number, sweepRadians: number): number {
  if (!Number.isFinite(radius) || radius < 0) {
    throw new Error('radius must be a finite non-negative number');
  }
  if (!Number.isFinite(sweepRadians)) {
    throw new Error('sweepRadians must be finite');
  }
  return Math.abs(radius * sweepRadians);
}

function orientation(a: Point, b: Point, c: Point): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function onSegment(a: Point, b: Point, c: Point): boolean {
  return (
    b.x <= Math.max(a.x, c.x) &&
    b.x >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) &&
    b.y >= Math.min(a.y, c.y)
  );
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;

  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

export function isSimplePolygon(points: readonly Point[]): boolean {
  if (points.length < 3) return false;

  for (let i = 0; i < points.length; i += 1) {
    const iNext = (i + 1) % points.length;
    for (let j = i + 1; j < points.length; j += 1) {
      const jNext = (j + 1) % points.length;

      const adjacent =
        i === j ||
        iNext === j ||
        jNext === i ||
        (i === 0 && jNext === 0);

      if (adjacent) continue;

      if (segmentsIntersect(points[i], points[iNext], points[j], points[jNext])) {
        return false;
      }
    }
  }
  return true;
}
