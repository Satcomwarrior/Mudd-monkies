import fs from 'fs/promises';
import { PDFExtract } from 'pdf.js-extract';

// Type definitions moved from index.ts
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
}

interface ValidateBlueprintArgs {
  filePath: string;
}

// The core tool-handling logic, now in its own module
export const callToolHandler = async (request: any) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'echo': {
        const { message } = args as unknown as EchoArgs;
        return {
          content: [
            {
              type: 'text',
              text: `Echo: ${message || 'No message provided'}`,
            },
          ],
        };
      }

      case 'pdf_extract_text': {
        const { filePath } = args as unknown as PdfExtractTextArgs;
        try {
          const pdfExtract = new PDFExtract();
          const data = await pdfExtract.extract(filePath, {});
          const text = data.pages.map((page) => page.content.map((item) => item.str).join(' ')).join('\n');
          return {
            content: [
              {
                type: 'text',
                text: `Extracted text from ${filePath}:\n\n${text}`,
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'An unknown error occurred';
          return {
            content: [
              {
                type: 'text',
                text: `Error processing PDF file at ${filePath}: ${errorMessage}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'calculate_area': {
        const { points } = args as unknown as CalculateAreaArgs;
        if (points.length < 3) {
          return {
            content: [
              {
                type: 'text',
                text: 'At least 3 points are required to calculate an area.',
              },
            ],
            isError: true,
          };
        }

        let area = 0;
        for (let i = 0; i < points.length; i++) {
          const j = (i + 1) % points.length;
          area += points[i].x * points[j].y;
          area -= points[j].x * points[i].y;
        }

        area = Math.abs(area) / 2;

        return {
          content: [{ type: 'text', text: `The calculated area is: ${area}` }],
        };
      }

      case 'validate_blueprint': {
        const { filePath } = args as unknown as ValidateBlueprintArgs;
        try {
          const pdfExtract = new PDFExtract();
          const data = await pdfExtract.extract(filePath, {});
          const text = data.pages.map((page: any) => page.content.map((item: any) => item.str).join(' ')).join('\n').toLowerCase();

          const hasTitleBlock = /project:|title:|revision:|sheet:|drawn by:/.test(text);
          const hasScale = /scale:|scale =|scale: \d|"=|= \d'|"\s*=\s*\d+'/.test(text);

          const results = [];
          if (hasTitleBlock) {
            results.push('✅ Title block found.');
          } else {
            results.push('❌ Title block not found.');
          }

          if (hasScale) {
            results.push('✅ Scale information found.');
          } else {
            results.push('❌ Scale information not found.');
          }

          return {
            content: [{ type: 'text', text: results.join('\n') }],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'An unknown error occurred';
          return {
            content: [
              {
                type: 'text',
                text: `Error processing PDF file at ${filePath}: ${errorMessage}`,
              },
            ],
            isError: true,
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool ${name}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
      ],
      isError: true,
    };
  }
};
