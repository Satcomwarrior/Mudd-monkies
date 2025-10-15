import fs from 'node:fs/promises';
import path from 'node:path';

type PromptRole = 'user' | 'assistant' | 'system';

export interface PromptExchange {
  role: PromptRole;
  content: string;
  timestamp?: string;
  context?: Record<string, unknown>;
  error?: string;
}

export interface GuidanceAction {
  label: string;
  prompt: string;
  description?: string;
}

export interface GuidanceResponse {
  message: string;
  summary?: string;
  recommendations?: string[];
  actions?: GuidanceAction[];
  references?: string[];
  raw?: unknown;
}

export interface GuidanceRequest {
  prompt: string;
  projectId?: string;
  context?: Record<string, unknown>;
  history?: PromptExchange[];
}

export interface ProjectSearchResult {
  id: string;
  name: string;
  location?: string;
  metadata?: Record<string, unknown>;
}

interface ConstructConnectConfig {
  baseUrl?: string;
  apiKey?: string;
  artifactDirectory?: string;
}

export class ConstructConnectError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ConstructConnectError';
    this.status = status;
    this.details = details;
  }
}

const getEnvVar = (key: string): string | undefined => {
  if (typeof process === 'undefined') return undefined;

  const direct = process.env[key];
  if (direct) return direct;

  const publicKey = `NEXT_PUBLIC_${key}`;
  return process.env[publicKey];
};

const getConfig = (): ConstructConnectConfig => ({
  baseUrl: getEnvVar('CONSTRUCTCONNECT_API_BASE_URL'),
  apiKey: getEnvVar('CONSTRUCTCONNECT_API_KEY'),
  artifactDirectory: getEnvVar('CONSTRUCTCONNECT_ARTIFACT_DIR')
});

const withAuthorization = (apiKey?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return headers;
};

const buildUrl = (baseUrl: string | undefined, pathName: string): string => {
  if (!baseUrl) {
    throw new ConstructConnectError(
      'ConstructConnect base URL is not configured. Please set CONSTRUCTCONNECT_API_BASE_URL.',
      503
    );
  }

  return `${baseUrl.replace(/\/$/, '')}/${pathName.replace(/^\//, '')}`;
};

const loadFromArtifacts = async <T>(artifactDirectory: string | undefined, artifactName: string): Promise<T> => {
  if (!artifactDirectory) {
    throw new ConstructConnectError(
      'No ConstructConnect endpoint configured and CONSTRUCTCONNECT_ARTIFACT_DIR is not set.',
      503
    );
  }

  const filePath = path.join(artifactDirectory, `${artifactName}.json`);

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new ConstructConnectError(
      `Unable to load artifact sample at ${filePath}.`,
      500,
      error
    );
  }
};

const resolveGuidanceResponse = (payload: unknown): GuidanceResponse => {
  if (payload && typeof payload === 'object') {
    const maybeResponse = payload as Partial<GuidanceResponse> & { message?: string };
    if (maybeResponse.message) {
      return {
        message: maybeResponse.message,
        summary: maybeResponse.summary,
        recommendations: maybeResponse.recommendations,
        actions: maybeResponse.actions,
        references: maybeResponse.references,
        raw: maybeResponse.raw ?? payload
      };
    }
  }

  return {
    message: 'No guidance was returned from the ConstructConnect service.',
    raw: payload
  };
};

export const fetchGuidance = async (request: GuidanceRequest): Promise<GuidanceResponse> => {
  const config = getConfig();

  if (config.baseUrl && config.apiKey) {
    const response = await fetch(
      buildUrl(config.baseUrl, '/guidance'),
      {
        method: 'POST',
        headers: withAuthorization(config.apiKey),
        body: JSON.stringify({
          ...request,
          artifactDirectory: config.artifactDirectory
        })
      }
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new ConstructConnectError(
        'ConstructConnect guidance request failed.',
        response.status,
        payload
      );
    }

    return resolveGuidanceResponse(payload);
  }

  // Fall back to static artifact samples if configured
  const artifactResponse = await loadFromArtifacts<GuidanceResponse | { message?: string }>(
    config.artifactDirectory,
    'guidance'
  );

  return resolveGuidanceResponse(artifactResponse);
};

export const searchProjects = async (query: string): Promise<ProjectSearchResult[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const config = getConfig();

  if (config.baseUrl && config.apiKey) {
    const response = await fetch(
      buildUrl(config.baseUrl, '/projects:search'),
      {
        method: 'POST',
        headers: withAuthorization(config.apiKey),
        body: JSON.stringify({ query: trimmedQuery })
      }
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new ConstructConnectError(
        'ConstructConnect project search failed.',
        response.status,
        payload
      );
    }

    return Array.isArray(payload?.results)
      ? (payload.results as ProjectSearchResult[])
      : [];
  }

  const artifactResults = await loadFromArtifacts<{ results?: ProjectSearchResult[] }>(
    config.artifactDirectory,
    'projects'
  );

  return artifactResults.results ?? [];
};
