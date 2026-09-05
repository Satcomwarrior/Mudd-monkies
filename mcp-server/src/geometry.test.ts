import { describe, expect, it } from 'vitest';
import {
  Point,
  shoelaceArea,
  euclideanDistance,
  scaledArea,
  scaledDistance,
} from './geometry';

describe('shoelaceArea', () => {
  it('returns 0 for fewer than 3 points', () => {
    expect(shoelaceArea([])).toBe(0);
    expect(shoelaceArea([{ x: 0, y: 0 }])).toBe(0);
    expect(
      shoelaceArea([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toBe(0);
  });

  it('computes area of a unit square', () => {
    const square: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(shoelaceArea(square)).toBe(1);
  });

  it('computes area of a 4×3 rectangle', () => {
    const rect: Point[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
      { x: 0, y: 3 },
    ];
    expect(shoelaceArea(rect)).toBe(12);
  });

  it('computes area of a right triangle', () => {
    const triangle: Point[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
    ];
    expect(shoelaceArea(triangle)).toBe(6);
  });

  it('is invariant to winding order (clockwise vs counter-clockwise)', () => {
    const ccw: Point[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ];
    const cw: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 0 },
    ];
    expect(shoelaceArea(ccw)).toBe(4);
    expect(shoelaceArea(cw)).toBe(4);
  });

  it('handles translated polygons (translation invariance)', () => {
    const base: Point[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ];
    const shifted = base.map((p) => ({ x: p.x + 100, y: p.y - 50 }));
    expect(shoelaceArea(shifted)).toBe(shoelaceArea(base));
  });

  it('handles irregular pentagon', () => {
    // Known shoelace result for this pentagon
    const pentagon: Point[] = [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 2 },
      { x: 1.5, y: 3 },
      { x: -1, y: 1 },
    ];
    // Manual: sum x_i y_{i+1} - x_{i+1} y_i
    // (0*0-3*0)+(3*2-4*0)+(4*3-1.5*2)+(1.5*1-(-1)*3)+((-1)*0-0*1)
    // = 0 + 6 + 12-3 + 1.5+3 + 0 = 19.5; abs/2 = 9.75
    expect(shoelaceArea(pentagon)).toBeCloseTo(9.75, 10);
  });
});

describe('euclideanDistance', () => {
  it('returns 0 for identical points', () => {
    expect(euclideanDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it('computes 3-4-5 right triangle hypotenuse', () => {
    expect(euclideanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('is symmetric', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 7, y: 10 };
    expect(euclideanDistance(a, b)).toBe(euclideanDistance(b, a));
  });

  it('handles negative coordinates', () => {
    expect(euclideanDistance({ x: -3, y: -4 }, { x: 0, y: 0 })).toBe(5);
  });

  it('computes axis-aligned distances', () => {
    expect(euclideanDistance({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(10);
    expect(euclideanDistance({ x: 0, y: 0 }, { x: 0, y: 7 })).toBe(7);
  });
});

describe('scaledArea', () => {
  const rect: Point[] = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 3 },
    { x: 0, y: 3 },
  ];

  it('divides pixel area by scaleFactor squared', () => {
    // 12 px² / 2² = 3
    expect(scaledArea(rect, 2)).toBe(3);
  });

  it('returns pixel area when scaleFactor is 1', () => {
    expect(scaledArea(rect, 1)).toBe(12);
  });

  it('throws for zero scaleFactor', () => {
    expect(() => scaledArea(rect, 0)).toThrow(/positive number/i);
  });

  it('throws for negative scaleFactor', () => {
    expect(() => scaledArea(rect, -1)).toThrow(/positive number/i);
  });

  it('handles fractional scale factors', () => {
    // 12 / (0.5²) = 12 / 0.25 = 48
    expect(scaledArea(rect, 0.5)).toBe(48);
  });
});

describe('scaledDistance', () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 3, y: 4 }; // 5 px

  it('divides pixel distance by scaleFactor', () => {
    expect(scaledDistance(p1, p2, 2)).toBe(2.5);
  });

  it('returns pixel distance when scaleFactor is 1', () => {
    expect(scaledDistance(p1, p2, 1)).toBe(5);
  });

  it('throws for zero scaleFactor', () => {
    expect(() => scaledDistance(p1, p2, 0)).toThrow(/positive number/i);
  });

  it('throws for negative scaleFactor', () => {
    expect(() => scaledDistance(p1, p2, -2)).toThrow(/positive number/i);
  });

  it('handles fractional scale factors', () => {
    expect(scaledDistance(p1, p2, 0.5)).toBe(10);
  });
});
