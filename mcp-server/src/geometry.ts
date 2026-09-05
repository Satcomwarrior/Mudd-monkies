/** 2D point in pixel (or arbitrary) coordinates */
export interface Point {
  x: number;
  y: number;
}

/**
 * Shoelace formula — returns the absolute area of a polygon in square units
 * of the input coordinate system (typically px²).
 */
export function shoelaceArea(points: Point[]): number {
  if (points.length < 3) {
    return 0;
  }
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/** Euclidean distance between two points */
export function euclideanDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Convert a polygon's pixel area to real-world units².
 * scaleFactor is pixels per real-world unit (e.g. px/ft).
 */
export function scaledArea(points: Point[], scaleFactor: number): number {
  if (!scaleFactor || scaleFactor <= 0) {
    throw new Error('scaleFactor must be a positive number');
  }
  return shoelaceArea(points) / (scaleFactor * scaleFactor);
}

/**
 * Convert pixel distance between two points to real-world units.
 * scaleFactor is pixels per real-world unit (e.g. px/ft).
 */
export function scaledDistance(p1: Point, p2: Point, scaleFactor: number): number {
  if (!scaleFactor || scaleFactor <= 0) {
    throw new Error('scaleFactor must be a positive number');
  }
  return euclideanDistance(p1, p2) / scaleFactor;
}
