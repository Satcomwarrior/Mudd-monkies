export type Point = {
  x: number;
  y: number;
};

export type Measurement = {
  id: string;
  type: 'linear' | 'area';
  points: Point[];
  value: number;
};

export type PageMeasurements = {
  [pageNumber: number]: Measurement[];
};

export type MeasurementUnit = 'ft' | 'm' | 'in';

export type Tool = 'measure' | 'area';
