import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IDENTITY_TRANSFORM,
  applyAssembly,
  applyTransform,
  applyWaste,
  arcLength,
  canFinalizeRevision,
  circleArea,
  composeTransforms,
  convertArea,
  convertLength,
  distance,
  invertTransform,
  isSimplePolygon,
  pointsPerUnit,
  polygonArea,
  polylineLength,
  quantityFromGeometry,
  sheetAreaToReal,
  sheetLengthToReal,
  unresolvedRevisionImpacts,
  volumeFromArea,
  type Calibration,
} from '../src/index.ts';

const calibration: Calibration = {
  id: 'cal-1',
  sheetId: 'A1.1',
  pointA: { x: 0, y: 0 },
  pointB: { x: 100, y: 0 },
  knownDistance: 10,
  unit: 'ft',
  source: 'manual',
  reviewed: true,
};

test('distance and polyline length use deterministic geometry', () => {
  assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.equal(
    polylineLength([
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 6, y: 8 },
    ]),
    10,
  );
});

test('polygon area is winding and translation invariant', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  const reverse = [...square].reverse();
  const shifted = square.map((point) => ({ x: point.x + 50, y: point.y - 17 }));

  assert.equal(polygonArea(square), 100);
  assert.equal(polygonArea(reverse), 100);
  assert.equal(polygonArea(shifted), 100);
  assert.equal(isSimplePolygon(square), true);
});

test('self-intersecting polygon is rejected by simplicity check', () => {
  const bowTie = [
    { x: 0, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
    { x: 10, y: 0 },
  ];
  assert.equal(isSimplePolygon(bowTie), false);
});

test('circle and arc calculations are analytical', () => {
  assert.ok(Math.abs(circleArea(2) - Math.PI * 4) < 1e-12);
  assert.ok(Math.abs(arcLength(2, Math.PI / 2) - Math.PI) < 1e-12);
});

test('unit conversion handles length and area dimensions separately', () => {
  assert.ok(Math.abs(convertLength(1, 'ft', 'in') - 12) < 1e-12);
  assert.ok(Math.abs(convertArea(1, 'ft', 'in') - 144) < 1e-10);
  assert.ok(Math.abs(convertLength(1000, 'mm', 'm') - 1) < 1e-12);
});

test('calibration converts stable sheet coordinates to real quantities', () => {
  assert.equal(pointsPerUnit(calibration), 10);
  assert.equal(sheetLengthToReal(50, calibration, 'ft'), 5);
  assert.equal(sheetAreaToReal(10000, calibration, 'ft'), 100);
});

test('quantity engine uses the same calibration for lines and areas', () => {
  const line = quantityFromGeometry(
    { kind: 'line', start: { x: 0, y: 0 }, end: { x: 50, y: 0 } },
    calibration,
    'ft',
  );
  assert.deepEqual(line, { dimension: 'length', value: 5, unit: 'ft' });

  const area = quantityFromGeometry(
    {
      kind: 'rectangle',
      origin: { x: 0, y: 0 },
      width: 100,
      height: 100,
    },
    calibration,
    'ft',
  );
  assert.deepEqual(area, { dimension: 'area', value: 100, unit: 'ft' });

  const volume = volumeFromArea(area, 6, 'in');
  assert.deepEqual(volume, { dimension: 'volume', value: 50, unit: 'ft' });
});

test('waste is explicit and non-destructive', () => {
  const base = { dimension: 'area' as const, value: 100, unit: 'ft' as const };
  assert.deepEqual(applyWaste(base, 10), {
    dimension: 'area',
    value: 110.00000000000001,
    unit: 'ft',
  });
  assert.equal(base.value, 100);
});

test('assembly expansion creates component quantities without hidden conversion', () => {
  const result = applyAssembly(
    { dimension: 'area', value: 100, unit: 'ft' },
    {
      id: 'wall-system',
      name: 'Wall System',
      sourceDimension: 'area',
      components: [
        {
          id: 'lath',
          label: 'Lath',
          factor: 1.1,
          unit: 'ft',
          dimension: 'area',
        },
        {
          id: 'fastener',
          label: 'Fasteners',
          factor: 2.5,
          unit: 'ea',
          dimension: 'count',
        },
      ],
    },
  );

  assert.equal(result[0].quantity.value, 110.00000000000001);
  assert.equal(result[1].quantity.value, 250);
});

test('affine transform can round-trip PDF/sheet coordinates', () => {
  const transform = [2, 0, 0, -2, 10, 100] as const;
  const point = { x: 25, y: 30 };
  const viewportPoint = applyTransform(point, transform);
  const restored = applyTransform(viewportPoint, invertTransform(transform));

  assert.ok(Math.abs(restored.x - point.x) < 1e-12);
  assert.ok(Math.abs(restored.y - point.y) < 1e-12);

  assert.deepEqual(
    applyTransform(point, composeTransforms(IDENTITY_TRANSFORM, transform)),
    viewportPoint,
  );
});

test('revision cannot finalize while changed annotations are undecided', () => {
  const impacts = [
    { annotationId: 'a', changed: true },
    { annotationId: 'b', changed: false },
  ];

  assert.equal(unresolvedRevisionImpacts(impacts).length, 1);
  assert.equal(canFinalizeRevision(impacts), false);
  assert.equal(
    canFinalizeRevision([
      { annotationId: 'a', changed: true, decision: 'remeasure' },
      { annotationId: 'b', changed: false },
    ]),
    true,
  );
});
