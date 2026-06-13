import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callToolHandler } from './tool-handler';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function makePdf(text: string, filePath: string): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { x: 50, y: 500, font, size: 12, color: rgb(0, 0, 0) });
  await fs.writeFile(filePath, await pdfDoc.save());
}

function makeRequest(name: string, args: Record<string, unknown>) {
  return { params: { name, arguments: args } };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('MCP Server Tools', () => {
  const tempDir = path.join(os.tmpdir(), 'mudd-monkies-test');
  const basicPdfPath    = path.join(tempDir, 'basic.pdf');
  const blueprintPath   = path.join(tempDir, 'blueprint.pdf');
  const dimPdfPath      = path.join(tempDir, 'dimensions.pdf');
  const symbolPdfPath   = path.join(tempDir, 'symbols.pdf');
  const emptyPdfPath    = path.join(tempDir, 'empty.pdf');
  const takeoffJsonPath = path.join(tempDir, 'takeoff.json');

  beforeAll(async () => {
    await fs.mkdir(tempDir, { recursive: true });

    // Basic PDF
    await makePdf('This is a test PDF for vitest.', basicPdfPath);

    // Blueprint with title block + scale
    await makePdf(
      "Project: Test Project\nDrawn by: J. Smith\nScale: 1\"=1'",
      blueprintPath
    );

    // PDF with dimension annotations
    await makePdf(
      "Wall length: 12'-6\"\nRoom width: 3.5m\nCeiling height: 2400mm\nDoor opening: 36\"",
      dimPdfPath
    );

    // PDF with construction symbols
    await makePdf(
      'Install 3 doors and 5 windows. Add 12 outlets and 4 fixtures. Place 2 sinks.',
      symbolPdfPath
    );

    // Empty PDF (no text)
    const emptyDoc = await PDFDocument.create();
    emptyDoc.addPage();
    await fs.writeFile(emptyPdfPath, await emptyDoc.save());
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // ── echo ────────────────────────────────────────────────────────────────────
  describe('echo', () => {
    it('echoes the message back', async () => {
      const res = await callToolHandler(makeRequest('echo', { message: 'hello' }) as any);
      expect(res.content[0].text).toBe('Echo: hello');
    });

    it('handles missing message gracefully', async () => {
      const res = await callToolHandler(makeRequest('echo', {}) as any);
      expect(res.content[0].text).toBe('Echo: No message provided');
    });
  });

  // ── pdf_extract_text ────────────────────────────────────────────────────────
  describe('pdf_extract_text', () => {
    it('extracts text from a PDF', async () => {
      const res = await callToolHandler(makeRequest('pdf_extract_text', { filePath: basicPdfPath }) as any);
      expect(res.content[0].text).toContain('This is a test PDF for vitest.');
    });

    it('returns error for non-existent file', async () => {
      const res = await callToolHandler(makeRequest('pdf_extract_text', { filePath: '/nonexistent/file.pdf' }) as any);
      expect(res.isError).toBe(true);
    });
  });

  // ── calculate_area ──────────────────────────────────────────────────────────
  describe('calculate_area', () => {
    it('calculates area of a 10×10 square in pixels', async () => {
      const res = await callToolHandler(makeRequest('calculate_area', {
        points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
      }) as any);
      expect(res.content[0].text).toBe('The calculated area is: 100');
    });

    it('converts pixel area to real-world area with scaleFactor', async () => {
      // 10×10 px square, 2 px/ft → 5×5 ft = 25 ft²
      const res = await callToolHandler(makeRequest('calculate_area', {
        points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
        scaleFactor: 2,
        unit: 'ft',
      }) as any);
      expect(res.content[0].text).toContain('25.0000 ft²');
    });

    it('returns error for fewer than 3 points', async () => {
      const res = await callToolHandler(makeRequest('calculate_area', {
        points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      }) as any);
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('At least 3 points');
    });
  });

  // ── measure_distance ────────────────────────────────────────────────────────
  describe('measure_distance', () => {
    it('measures distance between two points with scale', async () => {
      // 3-4-5 right triangle in pixels, 1 px/ft → 5 ft
      const res = await callToolHandler(makeRequest('measure_distance', {
        point1: { x: 0, y: 0 },
        point2: { x: 3, y: 4 },
        scaleFactor: 1,
        unit: 'ft',
      }) as any);
      expect(res.content[0].text).toContain('5.0000 ft');
    });

    it('returns error for zero scaleFactor', async () => {
      const res = await callToolHandler(makeRequest('measure_distance', {
        point1: { x: 0, y: 0 },
        point2: { x: 10, y: 0 },
        scaleFactor: 0,
      }) as any);
      expect(res.isError).toBe(true);
    });
  });

  // ── extract_dimensions ──────────────────────────────────────────────────────
  describe('extract_dimensions', () => {
    it('extracts dimension annotations from a PDF', async () => {
      const res = await callToolHandler(makeRequest('extract_dimensions', { filePath: dimPdfPath }) as any);
      expect(res.content[0].text).toContain('dimension');
      // Should find at least one of the known dimensions
      const text = res.content[0].text;
      const found = ["12'-6\"", '3.5m', '2400mm', '36"'].some((d) => text.includes(d));
      expect(found).toBe(true);
    });

    it('reports no dimensions for empty PDF', async () => {
      const res = await callToolHandler(makeRequest('extract_dimensions', { filePath: emptyPdfPath }) as any);
      expect(res.content[0].text).toContain('No dimension annotations found');
    });
  });

  // ── count_symbols ───────────────────────────────────────────────────────────
  describe('count_symbols', () => {
    it('counts construction symbols in a PDF', async () => {
      const res = await callToolHandler(makeRequest('count_symbols', { filePath: symbolPdfPath }) as any);
      const text = res.content[0].text;
      expect(text).toContain('door');
      expect(text).toContain('window');
      expect(text).toContain('outlet');
    });

    it('supports custom symbol list', async () => {
      const res = await callToolHandler(makeRequest('count_symbols', {
        filePath: symbolPdfPath,
        symbols: ['sink', 'fixture'],
      }) as any);
      const text = res.content[0].text;
      expect(text).toContain('sink');
      expect(text).toContain('fixture');
    });

    it('reports no symbols for empty PDF', async () => {
      const res = await callToolHandler(makeRequest('count_symbols', { filePath: emptyPdfPath }) as any);
      expect(res.content[0].text).toContain('No matching symbols found');
    });
  });

  // ── validate_blueprint ──────────────────────────────────────────────────────
  describe('validate_blueprint', () => {
    it('validates a blueprint with title block and scale', async () => {
      const res = await callToolHandler(makeRequest('validate_blueprint', { filePath: blueprintPath }) as any);
      expect(res.content[0].text).toContain('✅ Title block found.');
      expect(res.content[0].text).toContain('✅ Scale information found.');
    });

    it('fails validation for empty PDF', async () => {
      const res = await callToolHandler(makeRequest('validate_blueprint', { filePath: emptyPdfPath }) as any);
      expect(res.content[0].text).toContain('❌ Title block not found.');
      expect(res.content[0].text).toContain('❌ Scale information not found.');
    });
  });

  // ── save_takeoff / load_takeoff ─────────────────────────────────────────────
  describe('save_takeoff and load_takeoff', () => {
    const sampleItems = [
      {
        id: 'a1',
        label: 'Living Room Floor',
        type: 'area',
        value: 250.5,
        unit: 'ft',
        notes: 'Main floor area',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'd1',
        label: 'North Wall',
        type: 'distance',
        value: 18.25,
        unit: 'ft',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'c1',
        label: 'Doors',
        type: 'count',
        value: 4,
        unit: 'ea',
        timestamp: new Date().toISOString(),
      },
    ];

    it('saves a takeoff JSON file', async () => {
      const res = await callToolHandler(makeRequest('save_takeoff', {
        outputPath: takeoffJsonPath,
        projectName: 'Test Project Alpha',
        items: sampleItems,
      }) as any);
      expect(res.content[0].text).toContain('Takeoff saved successfully.');
      expect(res.content[0].text).toContain('Test Project Alpha');
      // Verify file was actually written
      const stat = await fs.stat(takeoffJsonPath);
      expect(stat.size).toBeGreaterThan(0);
    });

    it('loads a saved takeoff file', async () => {
      const res = await callToolHandler(makeRequest('load_takeoff', { filePath: takeoffJsonPath }) as any);
      const text = res.content[0].text;
      expect(text).toContain('Test Project Alpha');
      expect(text).toContain('Living Room Floor');
      expect(text).toContain('North Wall');
      expect(text).toContain('Doors');
    });

    it('returns error for missing takeoff file', async () => {
      const res = await callToolHandler(makeRequest('load_takeoff', { filePath: '/nonexistent/takeoff.json' }) as any);
      expect(res.isError).toBe(true);
    });
  });

  // ── generate_report ─────────────────────────────────────────────────────────
  describe('generate_report', () => {
    it('generates CSV and text report from takeoff JSON', async () => {
      const res = await callToolHandler(makeRequest('generate_report', {
        filePath: takeoffJsonPath,
        outputDir: tempDir,
      }) as any);
      const text = res.content[0].text;
      expect(text).toContain('Test Project Alpha');
      expect(text).toContain('AREAS');
      expect(text).toContain('DISTANCES');
      expect(text).toContain('COUNTS');

      // Verify CSV was written
      const csvStat = await fs.stat(path.join(tempDir, 'takeoff_report.csv'));
      expect(csvStat.size).toBeGreaterThan(0);

      // Verify summary text was written
      const txtStat = await fs.stat(path.join(tempDir, 'takeoff_report.txt'));
      expect(txtStat.size).toBeGreaterThan(0);
    });
  });

  // ── unknown tool ────────────────────────────────────────────────────────────
  describe('unknown tool', () => {
    it('returns error for unknown tool name', async () => {
      const res = await callToolHandler(makeRequest('nonexistent_tool', {}) as any);
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Unknown tool');
    });
  });
});