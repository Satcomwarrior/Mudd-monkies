#!/usr/bin/env node

/**
 * MCP Server for PDF Takeoff Tool
 * Provides tools for construction measurement and PDF analysis
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { callToolHandler } from './tool-handler.js';

/**
 * Create the MCP server instance
 */
const server = new Server(
  {
    name: 'mudd-monkies-mcp-server',
    version: '2.0.0',
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
  // ── Utility ──────────────────────────────────────────────────────────────
  {
    name: 'echo',
    description: 'Echo back a message — useful for testing the MCP connection.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to echo back.',
        },
      },
      required: ['message'],
    },
  },

  // ── PDF Analysis ──────────────────────────────────────────────────────────
  {
    name: 'pdf_extract_text',
    description: 'Extract all text content from a PDF file, page by page.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the PDF file.',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'validate_blueprint',
    description:
      'Perform basic quality checks on a blueprint PDF — verifies presence of a title block and scale information.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the PDF file.',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'extract_dimensions',
    description:
      'Scan a blueprint PDF and extract all dimension annotations (e.g. 12\'-6", 3.5m, 1200mm). Returns matches grouped by page.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the PDF file.',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'count_symbols',
    description:
      'Count occurrences of construction symbols (doors, windows, outlets, fixtures, etc.) in a blueprint PDF. Provide custom symbol keywords or use the built-in defaults.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the PDF file.',
        },
        symbols: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional list of symbol keywords to search for. Defaults to common construction symbols (door, window, outlet, fixture, etc.).',
        },
      },
      required: ['filePath'],
    },
  },

  // ── Measurement ───────────────────────────────────────────────────────────
  {
    name: 'calculate_area',
    description:
      'Calculate the area of a polygon given a list of pixel-coordinate points. Optionally provide a scaleFactor (pixels per real-world unit) to convert to real-world area.',
    inputSchema: {
      type: 'object',
      properties: {
        points: {
          type: 'array',
          description: 'Array of {x, y} pixel coordinates defining the polygon.',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
            },
            required: ['x', 'y'],
          },
        },
        scaleFactor: {
          type: 'number',
          description:
            'Pixels per real-world unit (e.g. 96 if 96px = 1 foot). When provided, the result is converted to real-world area.',
        },
        unit: {
          type: 'string',
          description: 'Label for the real-world unit (e.g. "ft", "m"). Defaults to "px".',
        },
      },
      required: ['points'],
    },
  },
  {
    name: 'measure_distance',
    description:
      'Measure the real-world distance between two pixel-coordinate points on a blueprint, given a scale factor.',
    inputSchema: {
      type: 'object',
      properties: {
        point1: {
          type: 'object',
          description: 'Start point {x, y} in pixels.',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
          },
          required: ['x', 'y'],
        },
        point2: {
          type: 'object',
          description: 'End point {x, y} in pixels.',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
          },
          required: ['x', 'y'],
        },
        scaleFactor: {
          type: 'number',
          description: 'Pixels per real-world unit (e.g. 96 if 96px = 1 foot).',
        },
        unit: {
          type: 'string',
          description: 'Label for the real-world unit (e.g. "ft", "m"). Defaults to "ft".',
        },
      },
      required: ['point1', 'point2', 'scaleFactor'],
    },
  },

  // ── Takeoff Persistence ───────────────────────────────────────────────────
  {
    name: 'save_takeoff',
    description:
      'Save a set of takeoff measurements (areas, distances, counts) to a JSON file for later retrieval.',
    inputSchema: {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Absolute path where the JSON file should be written.',
        },
        projectName: {
          type: 'string',
          description: 'Human-readable project name.',
        },
        items: {
          type: 'array',
          description: 'Array of takeoff items to save.',
          items: {
            type: 'object',
            properties: {
              id:        { type: 'string' },
              label:     { type: 'string' },
              type:      { type: 'string', enum: ['area', 'distance', 'count'] },
              value:     { type: 'number' },
              unit:      { type: 'string' },
              notes:     { type: 'string' },
              timestamp: { type: 'string' },
            },
            required: ['id', 'label', 'type', 'value', 'unit', 'timestamp'],
          },
        },
      },
      required: ['outputPath', 'projectName', 'items'],
    },
  },
  {
    name: 'load_takeoff',
    description: 'Load a previously saved takeoff JSON file and display a summary of all items.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the takeoff JSON file.',
        },
      },
      required: ['filePath'],
    },
  },

  // ── Reporting ─────────────────────────────────────────────────────────────
  {
    name: 'generate_report',
    description:
      'Generate a formatted takeoff report (CSV + plain-text summary) from a saved takeoff JSON file.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the takeoff JSON file.',
        },
        outputDir: {
          type: 'string',
          description:
            'Directory where report files will be written. Defaults to the same directory as the JSON file.',
        },
      },
      required: ['filePath'],
    },
  },
];

/**
 * Register tool handlers
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, callToolHandler);

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Mudd Monkies MCP Server v2.0.0 running on stdio');
  console.error('Tools available: echo, pdf_extract_text, validate_blueprint,');
  console.error('  extract_dimensions, count_symbols, calculate_area,');
  console.error('  measure_distance, save_takeoff, load_takeoff, generate_report');
  console.error('Ready for Claude integration');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down MCP server...');
  await server.close();
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});

export default server;