#!/usr/bin/env node

/**
 * MCP Server for PDF Takeoff Tool
 * Provides tools for construction measurement and PDF analysis
 *
 * This is a minimal scaffold implementing MCP (Model Context Protocol)
 * with a placeholder echo tool for development and testing.
 */

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  runConstructGuidance,
  type ConstructGuidanceArgs,
} from './tools/constructGuidance.js';

interface EchoArgs {
  message?: string;
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
    name: 'construct_guidance',
    description:
      'Surface ConstructConnect recommendations using proprietary LLM artifacts and measurement context.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Primary question or instruction for the ConstructConnect guidance model.',
        },
        projectId: {
          type: 'string',
          description: 'Optional identifier for the active project or opportunity.',
        },
        measurementSummary: {
          type: 'string',
          description: 'Summary of measurements or takeoff context gathered in the UI.',
        },
      },
      required: ['prompt'],
    },
  },
  // TODO: Add more construction-specific tools:
  // - pdf_extract_measurements
  // - calculate_area
  // - estimate_materials
  // - validate_blueprint
];

/**
 * Register tool handlers
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'echo': {
        const { message } = args as EchoArgs;
        return {
          content: [
            {
              type: 'text',
              text: `Echo: ${message || 'No message provided'}`,
            },
          ],
        };
      }

      case 'construct_guidance': {
        const partialArgs = (args ?? {}) as Partial<ConstructGuidanceArgs>;
        if (!partialArgs.prompt) {
          throw new Error('construct_guidance requires a prompt argument');
        }

        const result = await runConstructGuidance({
          prompt: partialArgs.prompt,
          projectId: partialArgs.projectId,
          measurementSummary: partialArgs.measurementSummary,
        });
        return {
          content: [
            {
              type: 'text',
              text: result.message,
            },
            ...result.references.map((reference) => ({
              type: 'text' as const,
              text: `Reference: ${reference.name}${
                reference.snippet ? `\n${reference.snippet}` : ''
              }`,
            })),
          ],
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
          text: `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

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
