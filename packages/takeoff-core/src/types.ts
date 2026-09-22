export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type AnnotationGeometry =
  | { kind: 'line'; start: Point; end: Point }
  | { kind: 'polyline'; points: Point[] }
  | { kind: 'polygon'; points: Point[] }
  | { kind: 'rectangle'; origin: Point; width: number; height: number }
  | { kind: 'circle'; center: Point; radius: number }
  | { kind: 'count'; point: Point };

export type QuantityDimension = 'length' | 'area' | 'count' | 'volume';
