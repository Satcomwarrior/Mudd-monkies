import type { Point } from './types.ts';

export type AffineTransform = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
];

export const IDENTITY_TRANSFORM: AffineTransform = [1, 0, 0, 1, 0, 0];

export function applyTransform(
  point: Point,
  transform: AffineTransform,
): Point {
  const [a, b, c, d, e, f] = transform;
  return {
    x: a * point.x + c * point.y + e,
    y: b * point.x + d * point.y + f,
  };
}

export function invertTransform(
  transform: AffineTransform,
): AffineTransform {
  const [a, b, c, d, e, f] = transform;
  const determinant = a * d - b * c;

  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) {
    throw new Error('transform is not invertible');
  }

  return [
    d / determinant,
    -b / determinant,
    -c / determinant,
    a / determinant,
    (c * f - d * e) / determinant,
    (b * e - a * f) / determinant,
  ];
}

export function composeTransforms(
  first: AffineTransform,
  second: AffineTransform,
): AffineTransform {
  const [a1, b1, c1, d1, e1, f1] = first;
  const [a2, b2, c2, d2, e2, f2] = second;

  return [
    a2 * a1 + c2 * b1,
    b2 * a1 + d2 * b1,
    a2 * c1 + c2 * d1,
    b2 * c1 + d2 * d1,
    a2 * e1 + c2 * f1 + e2,
    b2 * e1 + d2 * f1 + f2,
  ];
}
