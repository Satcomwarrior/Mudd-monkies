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
  {
    name: 'validate_blueprint',
    description: 'Perform basic quality checks on a blueprint PDF',
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
