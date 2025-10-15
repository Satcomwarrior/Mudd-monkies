import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';

export interface ConstructGuidanceArgs {
  promptFile: string;
  contextFiles?: string[];
  model?: string;
  variables?: Record<string, string>;
  temperature?: number;
  maxTokens?: number;
}

export interface ConstructGuidanceResult {
  text: string;
  metadata?: Record<string, unknown>;
}

const DEFAULT_TIMEOUT = Number.parseInt(process.env.LLM_REQUEST_TIMEOUT_MS ?? '60000', 10);

function resolveArtifactsPath(): string {
  const basePath = process.env.CLAUDE_AI_ARTIFACTS_PATH;
  if (!basePath) {
    throw new Error(
      'CLAUDE_AI_ARTIFACTS_PATH is not set. Please configure it in mcp-server/.env so the MCP server can read prompt artifacts.'
    );
  }

  return path.resolve(basePath);
}

async function readArtifact(artifactPath: string, description: string): Promise<string> {
  try {
    return await fs.readFile(artifactPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `${description} not found at ${artifactPath}. Ensure the file exists in CLAUDE_AI_ARTIFACTS_PATH.`
      );
    }

    throw new Error(`Unable to read ${description} at ${artifactPath}: ${(error as Error).message}`);
  }
}

function applyVariables(template: string, variables?: Record<string, string>): string {
  if (!variables) {
    return template;
  }

  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => {
    if (!(key in variables)) {
      throw new Error(`Missing variable "${key}" required by the prompt template.`);
    }
    return variables[key];
  });
}

async function callLlm(payload: Record<string, unknown>): Promise<unknown> {
  const urlString = process.env.LLM_API_URL;
  if (!urlString) {
    throw new Error('LLM_API_URL is not set. Configure it in mcp-server/.env to point to your LLM runtime.');
  }

  const timeout = Number.isFinite(DEFAULT_TIMEOUT) ? DEFAULT_TIMEOUT : 60000;
  const requestBody = JSON.stringify(payload);
  const url = new URL(urlString);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  const headers: http.OutgoingHttpHeaders = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody),
  };

  if (process.env.LLM_API_KEY) {
    headers.Authorization = `Bearer ${process.env.LLM_API_KEY}`;
  }

  const rawResponse = await new Promise<string>((resolve, reject) => {
    const request = client.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers,
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;
        let responseData = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          if (statusCode < 200 || statusCode >= 300) {
            reject(
              new Error(
                `LLM runtime responded with status ${statusCode}: ${responseData || res.statusMessage || 'Unknown error'}`
              )
            );
            return;
          }
          resolve(responseData);
        });
      }
    );

    let didTimeout = false;

    request.on('error', (error) => {
      if (didTimeout) {
        reject(
          new Error(
            `Timed out after ${timeout}ms waiting for the LLM runtime. Increase LLM_REQUEST_TIMEOUT_MS if needed.`
          )
        );
      } else {
        reject(new Error(`Failed to call LLM runtime: ${error.message}`));
      }
    });

    request.setTimeout(timeout, () => {
      didTimeout = true;
      request.destroy(new Error('Request timed out'));
    });

    request.write(requestBody);
    request.end();
  });

  try {
    return JSON.parse(rawResponse);
  } catch (error) {
    return rawResponse;
  }
}

function extractTextFromResponse(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }

  if (data && typeof data === 'object') {
    const candidate =
      (data as Record<string, unknown>).output ??
      (data as Record<string, unknown>).text ??
      (data as Record<string, unknown>).completion ??
      (data as Record<string, unknown>).message;

    if (typeof candidate === 'string') {
      return candidate;
    }

    if (Array.isArray(candidate)) {
      return candidate.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join('\n');
    }
  }

  return JSON.stringify(data, null, 2);
}

export async function constructGuidance(args: ConstructGuidanceArgs): Promise<ConstructGuidanceResult> {
  if (!args?.promptFile) {
    throw new Error('promptFile is required when calling construct_guidance.');
  }

  const artifactsPath = resolveArtifactsPath();
  const promptPath = path.resolve(artifactsPath, args.promptFile);
  const promptTemplate = await readArtifact(promptPath, 'Prompt template');
  const prompt = applyVariables(promptTemplate, args.variables);

  let context: string[] = [];
  if (args.contextFiles?.length) {
    context = await Promise.all(
      args.contextFiles.map(async (contextFile) => {
        const contextPath = path.resolve(artifactsPath, contextFile);
        return readArtifact(contextPath, `Context file ${contextFile}`);
      })
    );
  }

  const payload: Record<string, unknown> = {
    model: args.model ?? process.env.LLM_MODEL,
    prompt,
    temperature: args.temperature ?? Number.parseFloat(process.env.LLM_TEMPERATURE ?? '0'),
    max_tokens: args.maxTokens ?? Number.parseInt(process.env.LLM_MAX_TOKENS ?? '1024', 10),
  };

  if (context.length) {
    payload.context = context;
  }

  const response = await callLlm(payload);
  const text = extractTextFromResponse(response);

  return {
    text,
    metadata: {
      model: payload.model,
      promptFile: promptPath,
      contextFiles: args.contextFiles?.map((file) => path.resolve(artifactsPath, file)) ?? [],
      runtimeUrl: process.env.LLM_API_URL,
    },
  };
}
