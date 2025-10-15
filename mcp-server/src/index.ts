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
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { constructGuidance, type ConstructGuidanceArgs } from './tools/constructGuidance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(envPath: string) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, 'utf8');
  const lines = contents.split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.trim().length === 0 || line.trim().startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    if (!key) {
      continue;
    }

    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(__dirname, '../.env'));

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
      'Generate constructability guidance using artifacts and an external LLM runtime',
    inputSchema: {
      type: 'object',
      properties: {
        promptFile: {
          type: 'string',
          description:
            'Relative path (from CLAUDE_AI_ARTIFACTS_PATH) to the primary prompt file',
        },
        contextFiles: {
          type: 'array',
          items: {
            type: 'string',
          },
          description:
            'Additional artifact files to include as supporting context (relative paths)',
        },
        model: {
          type: 'string',
          description: 'Optional override for the model identifier',
        },
        variables: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
          description:
            'Key/value substitutions that will be interpolated into the prompt template',
        },
        temperature: {
          type: 'number',
          description: 'Optional override for the sampling temperature',
        },
        maxTokens: {
          type: 'number',
          description: 'Optional override for the maximum tokens returned by the model',
        },
      },
      required: ['promptFile'],
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
        const { message } = (args ?? {}) as EchoArgs;
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
        const rawArgs = (args ?? {}) as unknown;
        if (!rawArgs || typeof rawArgs !== 'object') {
          throw new Error('construct_guidance requires an object of arguments.');
        }

        const { promptFile } = rawArgs as { promptFile?: unknown };
        if (typeof promptFile !== 'string' || promptFile.trim().length === 0) {
          throw new Error('construct_guidance requires a string promptFile argument.');
        }

        const guidanceArgs = rawArgs as ConstructGuidanceArgs;
        const result = await constructGuidance(guidanceArgs);
        return {
          content: [
            {
              type: 'text',
              text: result.text,
            },
          ],
          ...(result.metadata
            ? {
                meta: {
                  construct_guidance: result.metadata,
                },
              }
            : {}),
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
