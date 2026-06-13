import fs from 'fs/promises';
import path from 'path';
import { PDFExtract } from 'pdf.js-extract';

// ─── Type Definitions ────────────────────────────────────────────────────────

interface EchoArgs {
  message?: string;
}

interface PdfExtractTextArgs {
  filePath: string;
}

interface Point {
  x: number;
  y: number;
}

interface CalculateAreaArgs {
  points: Point[];
  scaleFactor?: number;   // pixels per real-world unit (e.g. pixels per foot)
  unit?: string;          // label for the unit, e.g. "ft", "m", "in"
}

interface MeasureDistanceArgs {
  point1: Point;
  point2: Point;
  scaleFactor: number;    // pixels per real-world unit
  unit?: string;          // label, e.g. "ft", "m"
}

interface ExtractDimensionsArgs {
  filePath: string;
}

interface CountSymbolsArgs {
  filePath: string;
  symbols?: string[];     // custom keywords to count; defaults to common construction symbols
}

interface TakeoffItem {
  id: string;
  label: string;
  type: 'area' | 'distance' | 'count';
  value: number;
  unit: string;
  notes?: string;
  timestamp: string;
}

interface SaveTakeoffArgs {
  outputPath: string;     // path to write the JSON file
  projectName: string;
  items: TakeoffItem[];
}

interface LoadTakeoffArgs {
  filePath: string;       // path to an existing takeoff JSON file
}

interface GenerateReportArgs {
  filePath: string;       // path to a takeoff JSON file
  outputDir?: string;     // directory to write report files (default: same dir as filePath)
}

interface ValidateBlueprintArgs {
  filePath: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Shoelace formula — returns area in pixel² (or scaled units² if scaleFactor provided) */
function shoelaceArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/** Euclidean distance between two points */
function euclideanDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/** Extract all text from a PDF, returning page-separated strings */
async function extractPdfText(filePath: string): Promise<string[]> {
  const pdfExtract = new PDFExtract();
  const data = await pdfExtract.extract(filePath, {});
  return data.pages.map((page) =>
    page.content.map((item) => item.str).join(' ')
  );
}

/** Default construction symbol keywords */
const DEFAULT_SYMBOLS = [
  'door', 'window', 'outlet', 'switch', 'fixture', 'sink', 'toilet',
  'column', 'beam', 'stair', 'elevator', 'duct', 'pipe', 'valve',
  'panel', 'meter', 'hatch', 'section', 'detail',
];

/** Dimension pattern: matches strings like 12'-6", 3.5m, 1200mm, 8'0", 24" */
const DIMENSION_PATTERN =
  /\b(\d+'\s*-?\s*\d+(?:\.\d+)?"|(?:\d+(?:\.\d+)?)\s*(?:ft|feet|m|mm|cm|in|inch|inches|'|"))\b/gi;

// ─── Tool Handler ─────────────────────────────────────────────────────────────

export const callToolHandler = async (request: any) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {

      // ── echo ──────────────────────────────────────────────────────────────
      case 'echo': {
        const { message } = args as unknown as EchoArgs;
        return {
          content: [{ type: 'text', text: `Echo: ${message ?? 'No message provided'}` }],
        };
      }

      // ── pdf_extract_text ──────────────────────────────────────────────────
      case 'pdf_extract_text': {
        const { filePath } = args as unknown as PdfExtractTextArgs;
        try {
          const pages = await extractPdfText(filePath);
          const text = pages.join('\n');
          return {
            content: [{ type: 'text', text: `Extracted text from ${filePath}:\n\n${text}` }],
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          return {
            content: [{ type: 'text', text: `Error processing PDF at ${filePath}: ${msg}` }],
            isError: true,
          };
        }
      }

      // ── calculate_area ────────────────────────────────────────────────────
      case 'calculate_area': {
        const { points, scaleFactor, unit = 'px' } = args as unknown as CalculateAreaArgs;
        if (points.length < 3) {
          return {
            content: [{ type: 'text', text: 'At least 3 points are required to calculate an area.' }],
            isError: true,
          };
        }

        const pixelArea = shoelaceArea(points);

        if (scaleFactor && scaleFactor > 0) {
          // Convert pixel² → real-world units²
          const realArea = pixelArea / (scaleFactor * scaleFactor);
          return {
            content: [{
              type: 'text',
              text: [
                `Pixel area:      ${pixelArea.toFixed(2)} px²`,
                `Scale factor:    ${scaleFactor} px/${unit}`,
                `Real-world area: ${realArea.toFixed(4)} ${unit}²`,
              ].join('\n'),
            }],
          };
        }

        return {
          content: [{ type: 'text', text: `The calculated area is: ${pixelArea}` }],
        };
      }

      // ── measure_distance ──────────────────────────────────────────────────
      case 'measure_distance': {
        const { point1, point2, scaleFactor, unit = 'ft' } = args as unknown as MeasureDistanceArgs;

        if (!scaleFactor || scaleFactor <= 0) {
          return {
            content: [{ type: 'text', text: 'scaleFactor must be a positive number (pixels per real-world unit).' }],
            isError: true,
          };
        }

        const pixelDist = euclideanDistance(point1, point2);
        const realDist = pixelDist / scaleFactor;

        return {
          content: [{
            type: 'text',
            text: [
              `Point 1:          (${point1.x}, ${point1.y})`,
              `Point 2:          (${point2.x}, ${point2.y})`,
              `Pixel distance:   ${pixelDist.toFixed(2)} px`,
              `Scale factor:     ${scaleFactor} px/${unit}`,
              `Real distance:    ${realDist.toFixed(4)} ${unit}`,
            ].join('\n'),
          }],
        };
      }

      // ── extract_dimensions ────────────────────────────────────────────────
      case 'extract_dimensions': {
        const { filePath } = args as unknown as ExtractDimensionsArgs;
        try {
          const pages = await extractPdfText(filePath);
          const allMatches: { page: number; dimension: string }[] = [];

          pages.forEach((pageText, idx) => {
            const matches = [...pageText.matchAll(DIMENSION_PATTERN)];
            matches.forEach((m) => {
              allMatches.push({ page: idx + 1, dimension: m[0].trim() });
            });
          });

          if (allMatches.length === 0) {
            return {
              content: [{ type: 'text', text: 'No dimension annotations found in the PDF.' }],
            };
          }

          // Deduplicate while preserving page info
          const seen = new Set<string>();
          const unique = allMatches.filter((m) => {
            const key = `${m.page}:${m.dimension}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          const lines = unique.map((m) => `  Page ${m.page}: ${m.dimension}`);
          return {
            content: [{
              type: 'text',
              text: `Found ${unique.length} dimension annotation(s):\n${lines.join('\n')}`,
            }],
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          return {
            content: [{ type: 'text', text: `Error extracting dimensions from ${filePath}: ${msg}` }],
            isError: true,
          };
        }
      }

      // ── count_symbols ─────────────────────────────────────────────────────
      case 'count_symbols': {
        const { filePath, symbols = DEFAULT_SYMBOLS } = args as unknown as CountSymbolsArgs;
        try {
          const pages = await extractPdfText(filePath);
          const fullText = pages.join('\n').toLowerCase();

          const counts: Record<string, number> = {};
          for (const sym of symbols) {
            const regex = new RegExp(`\\b${sym.toLowerCase()}s?\\b`, 'gi');
            const matches = fullText.match(regex);
            counts[sym] = matches ? matches.length : 0;
          }

          const found = Object.entries(counts).filter(([, v]) => v > 0);
          if (found.length === 0) {
            return {
              content: [{ type: 'text', text: 'No matching symbols found in the PDF text.' }],
            };
          }

          const lines = found
            .sort((a, b) => b[1] - a[1])
            .map(([sym, count]) => `  ${sym.padEnd(16)} ${count}`);

          return {
            content: [{
              type: 'text',
              text: `Symbol counts in ${path.basename(filePath)}:\n${'Symbol'.padEnd(18)}Count\n${'-'.repeat(26)}\n${lines.join('\n')}`,
            }],
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          return {
            content: [{ type: 'text', text: `Error counting symbols in ${filePath}: ${msg}` }],
            isError: true,
          };
        }
      }

      // ── save_takeoff ──────────────────────────────────────────────────────
      case 'save_takeoff': {
        const { outputPath, projectName, items } = args as unknown as SaveTakeoffArgs;
        try {
          const payload = {
            projectName,
            savedAt: new Date().toISOString(),
            itemCount: items.length,
            items,
          };
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf-8');
          return {
            content: [{
              type: 'text',
              text: `Takeoff saved successfully.\nProject: ${projectName}\nItems:   ${items.length}\nFile:    ${outputPath}`,
            }],
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          return {
            content: [{ type: 'text', text: `Error saving takeoff to ${outputPath}: ${msg}` }],
            isError: true,
          };
        }
      }

      // ── load_takeoff ──────────────────────────────────────────────────────
      case 'load_takeoff': {
        const { filePath } = args as unknown as LoadTakeoffArgs;
        try {
          const raw = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(raw);
          const items: TakeoffItem[] = data.items ?? [];

          const summary = items.map((item) =>
            `  [${item.type.toUpperCase()}] ${item.label}: ${item.value} ${item.unit}${item.notes ? ` — ${item.notes}` : ''}`
          ).join('\n');

          return {
            content: [{
              type: 'text',
              text: [
                `Takeoff loaded: ${data.projectName}`,
                `Saved at:       ${data.savedAt}`,
                `Items (${items.length}):`,
                summary,
              ].join('\n'),
            }],
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          return {
            content: [{ type: 'text', text: `Error loading takeoff from ${filePath}: ${msg}` }],
            isError: true,
          };
        }
      }

      // ── generate_report ───────────────────────────────────────────────────
      case 'generate_report': {
        const { filePath, outputDir } = args as unknown as GenerateReportArgs;
        try {
          const raw = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(raw);
          const items: TakeoffItem[] = data.items ?? [];
          const dir = outputDir ?? path.dirname(filePath);
          await fs.mkdir(dir, { recursive: true });

          // ── CSV ──
          const csvHeader = 'id,label,type,value,unit,notes,timestamp';
          const csvRows = items.map((item) =>
            [
              item.id,
              `"${item.label.replace(/"/g, '""')}"`,
              item.type,
              item.value,
              item.unit,
              `"${(item.notes ?? '').replace(/"/g, '""')}"`,
              item.timestamp,
            ].join(',')
          );
          const csvContent = [csvHeader, ...csvRows].join('\n');
          const csvPath = path.join(dir, 'takeoff_report.csv');
          await fs.writeFile(csvPath, csvContent, 'utf-8');

          // ── Summary text ──
          const areas   = items.filter((i) => i.type === 'area');
          const dists   = items.filter((i) => i.type === 'distance');
          const counts  = items.filter((i) => i.type === 'count');

          const totalArea  = areas.reduce((s, i) => s + i.value, 0);
          const totalDist  = dists.reduce((s, i) => s + i.value, 0);
          const totalCount = counts.reduce((s, i) => s + i.value, 0);

          const divider = '─'.repeat(50);
          const summaryLines = [
            `TAKEOFF REPORT`,
            `Project:    ${data.projectName}`,
            `Generated:  ${new Date().toISOString()}`,
            `Source:     ${filePath}`,
            divider,
            `AREAS (${areas.length} items)`,
            ...areas.map((i) => `  ${i.label.padEnd(30)} ${i.value.toFixed(4)} ${i.unit}²`),
            areas.length ? `  ${'TOTAL'.padEnd(30)} ${totalArea.toFixed(4)}` : '  (none)',
            divider,
            `DISTANCES (${dists.length} items)`,
            ...dists.map((i) => `  ${i.label.padEnd(30)} ${i.value.toFixed(4)} ${i.unit}`),
            dists.length ? `  ${'TOTAL'.padEnd(30)} ${totalDist.toFixed(4)}` : '  (none)',
            divider,
            `COUNTS (${counts.length} items)`,
            ...counts.map((i) => `  ${i.label.padEnd(30)} ${i.value}`),
            counts.length ? `  ${'TOTAL'.padEnd(30)} ${totalCount}` : '  (none)',
            divider,
            `Total line items: ${items.length}`,
          ];

          const summaryText = summaryLines.join('\n');
          const summaryPath = path.join(dir, 'takeoff_report.txt');
          await fs.writeFile(summaryPath, summaryText, 'utf-8');

          return {
            content: [{
              type: 'text',
              text: [
                `Report generated for: ${data.projectName}`,
                `CSV:     ${csvPath}`,
                `Summary: ${summaryPath}`,
                '',
                summaryText,
              ].join('\n'),
            }],
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          return {
            content: [{ type: 'text', text: `Error generating report from ${filePath}: ${msg}` }],
            isError: true,
          };
        }
      }

      // ── validate_blueprint ────────────────────────────────────────────────
      case 'validate_blueprint': {
        const { filePath } = args as unknown as ValidateBlueprintArgs;
        try {
          const pages = await extractPdfText(filePath);
          const text = pages.join('\n').toLowerCase();

          const hasTitleBlock = /project:|title:|revision:|sheet:|drawn by:/.test(text);
          const hasScale = /scale:|scale =|scale: \d|"=|= \d'|"\s*=\s*\d+'/.test(text);

          const results = [
            hasTitleBlock ? '✅ Title block found.' : '❌ Title block not found.',
            hasScale      ? '✅ Scale information found.' : '❌ Scale information not found.',
          ];

          return {
            content: [{ type: 'text', text: results.join('\n') }],
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          return {
            content: [{ type: 'text', text: `Error processing PDF at ${filePath}: ${msg}` }],
            isError: true,
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
};