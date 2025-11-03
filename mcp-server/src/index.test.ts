import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callToolHandler } from './index';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

describe('MCP Server Tools', () => {
  let tempPdfPath: string;

  beforeAll(async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText('This is a test PDF for vitest.', {
      x: 50,
      y: 500,
      font,
      size: 12,
      color: rgb(0, 0, 0),
    });
    const pdfBytes = await pdfDoc.save();
    tempPdfPath = path.join(os.tmpdir(), 'test.pdf');
    await fs.writeFile(tempPdfPath, pdfBytes);
  });

  afterAll(async () => {
    await fs.unlink(tempPdfPath);
  });

  it('should calculate the area of a square', async () => {
    const request = {
      params: {
        name: 'calculate_area',
        arguments: {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
          ],
        },
      },
    };
    const response = await callToolHandler(request as any);
    expect(response.content[0].text).toBe('The calculated area is: 100');
  });

  it('should return an error for less than 3 points', async () => {
    const request = {
      params: {
        name: 'calculate_area',
        arguments: {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
        },
      },
    };
    const response = await callToolHandler(request as any);
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toBe('At least 3 points are required to calculate an area.');
  });

  it('should extract text from a PDF', async () => {
    const request = {
      params: {
        name: 'pdf_extract_text',
        arguments: {
          filePath: tempPdfPath,
        },
      },
    };
    const response = await callToolHandler(request as any);
    expect(response.content[0].text).toContain('This is a test PDF for vitest.');
  });
});
