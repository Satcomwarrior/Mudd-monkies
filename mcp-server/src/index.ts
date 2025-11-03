#!/usr/bin/env node

/**
 * MCP Server for PDF Takeoff Tool
 * Provides tools for construction measurement and PDF analysis
 * 
 * This is a minimal scaffold implementing MCP (Model Context Protocol)
 * with a placeholder echo tool for development and testing.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  Request,
  Response,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import { PDFParse } from 'pdf-parse';

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

/**
 * Create the MCP server instance
 */
const server = new Server(
  {
    name: 'mudd-monkies-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Tool definitions
 * Each tool represents a capability that Claude can call
 */
const TOOLS: Tool[] = [
  {
    name: 'echo',
    description: 'Echo back a message - useful for testing MCP connection',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to echo back',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'pdf_extract_text',
    description: 'Extract text content from a PDF file',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'The absolute path to the PDF file',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'calculate_area',
    description: 'Calculate the area of a polygon given a list of points',
    inputSchema: {
      type: 'object',
      properties: {
        points: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
            },
            required: ['x', 'y'],
          },
        },
      },
      required: ['points'],
    },
  },
];

/**
 * Register tool handlers
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

export const callToolHandler = async (
  request: Request<typeof CallToolRequestSchema>
): Promise<Response<typeof CallToolRequestSchema>> => {
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
          const dataBuffer = await fs.readFile(filePath);
          const uint8Array = new Uint8Array(dataBuffer);
          const parser = new PDFParse(uint8Array);
          const data = await parser.getText();
          return {
            content: [
              {
                type: 'text',
                text: `Extracted text from ${filePath}:\n\n${data.text}`,
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

server.setRequestHandler(CallToolRequestSchema, callToolHandler);


/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr so it doesn't interfere with MCP communication on stdout
  console.error('Mudd Monkies MCP Server running on stdio');
  console.error('Ready for Claude integration');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down MCP server...');
  await server.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error in MCP server:', error);
    process.exit(1);
  });
}

export default server;
