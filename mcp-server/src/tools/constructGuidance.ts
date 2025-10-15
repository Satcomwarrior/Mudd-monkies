import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export interface ConstructGuidanceArgs {
  prompt: string;
  projectId?: string;
  measurementSummary?: string;
}

export interface ConstructGuidanceResult {
  message: string;
  references: Array<{ name: string; snippet?: string }>;
}

const ARTIFACTS_PATH = process.env.CLAUDE_AI_ARTIFACTS_PATH;
const MODEL_ENDPOINT = process.env.CONSTRUCTCONNECT_MODEL_ENDPOINT;
const MODEL_API_KEY = process.env.CONSTRUCTCONNECT_MODEL_API_KEY;

async function readArtifactSummaries(maxFiles = 3) {
  if (!ARTIFACTS_PATH) {
    throw new Error(
      'CLAUDE_AI_ARTIFACTS_PATH is not configured. Set it in mcp-server/.env so the guidance tool can load context.'
    );
  }

  const entries = await readdir(ARTIFACTS_PATH, { withFileTypes: true });
  const summaries: Array<{ name: string; snippet?: string }> = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith('.txt')) continue;

    const fullPath = path.join(ARTIFACTS_PATH, entry.name);
    const contents = await readFile(fullPath, 'utf-8');
    summaries.push({
      name: entry.name,
      snippet: contents.slice(0, 500),
    });

    if (summaries.length >= maxFiles) break;
  }

  return summaries;
}

async function callModelEndpoint(payload: Record<string, unknown>): Promise<string> {
  if (!MODEL_ENDPOINT) {
    const context = JSON.stringify(payload, null, 2);
    return [
      'ConstructConnect model endpoint is not configured. Returning contextual artifact snippets instead.',
      'Payload Context:',
      context,
    ].join('\n');
  }

  const response = await fetch(MODEL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(MODEL_API_KEY ? { Authorization: `Bearer ${MODEL_API_KEY}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `ConstructConnect model endpoint returned ${response.status}: ${text || response.statusText}`
    );
  }

  return await response.text();
}

export async function runConstructGuidance(
  args: ConstructGuidanceArgs
): Promise<ConstructGuidanceResult> {
  const references = await readArtifactSummaries();
  const payload = {
    ...args,
    references,
    timestamp: new Date().toISOString(),
  };

  const message = await callModelEndpoint(payload);

  return { message, references };
}
