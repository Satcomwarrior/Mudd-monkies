import { describe, expect, it } from 'vitest';
import { callToolHandler } from './tool-handler';

const call = (name: string, args: Record<string, unknown>) =>
  callToolHandler({ params: { name, arguments: args } });

describe('PDF takeoff measurement tools', () => {
  it('calculates polygon area with the shoelace formula', async () => {
    const result = await call('calculate_area', {
      points: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 3 },
      ],
    });

    expect(result.isError).not.toBe(true);
    expect(result.content[0].text).toContain('12');
  });

  it('converts pixel area using the square of the scale factor', async () => {
    const result = await call('calculate_area', {
      points: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 3 },
      ],
      scaleFactor: 2,
      unit: 'ft',
    });

    expect(result.isError).not.toBe(true);
    expect(result.content[0].text).toContain('Pixel area:      12.00 px²');
    expect(result.content[0].text).toContain('Real-world area: 3.0000 ft²');
  });

  it('rejects area calculations with fewer than three points', async () => {
    const result = await call('calculate_area', {
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/at least 3 points/i);
  });

  it('calculates scaled Euclidean distance', async () => {
    const result = await call('measure_distance', {
      point1: { x: 0, y: 0 },
      point2: { x: 3, y: 4 },
      scaleFactor: 2,
      unit: 'ft',
    });

    expect(result.isError).not.toBe(true);
    expect(result.content[0].text).toContain('Pixel distance:   5.00 px');
    expect(result.content[0].text).toContain('Real distance:    2.5000 ft');
  });

  it('rejects non-positive distance scale factors', async () => {
    const result = await call('measure_distance', {
      point1: { x: 0, y: 0 },
      point2: { x: 3, y: 4 },
      scaleFactor: 0,
      unit: 'ft',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/positive number/i);
  });
});
