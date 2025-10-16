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
  useRemote?: boolean;
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
  artifactDirectory: getEnvVar('CONSTRUCTCONNECT_ARTIFACT_DIR'),
  useRemote: getEnvVar('CONSTRUCTCONNECT_USE_REMOTE')?.toLowerCase() === 'true'
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

const localProjects: ProjectSearchResult[] = [
  {
    id: 'muddy-hollow-civic-center',
    name: 'Muddy Hollow Civic Center Renovation',
    location: 'Bend, OR',
    metadata: {
      stage: 'design-development',
      focus: 'Community gathering hall refresh'
    }
  },
  {
    id: 'redwood-learning-commons',
    name: 'Redwood Learning Commons Expansion',
    location: 'Sacramento, CA',
    metadata: {
      stage: 'schematic-design',
      focus: 'STEM classroom addition'
    }
  },
  {
    id: 'copper-creek-hospitality',
    name: 'Copper Creek Boutique Hotel',
    location: 'Flagstaff, AZ',
    metadata: {
      stage: 'construction-documents',
      focus: 'Mountain lodge concept'
    }
  },
  {
    id: 'meridian-transit-hub',
    name: 'Meridian Multi-Modal Transit Hub',
    location: 'Columbus, OH',
    metadata: {
      stage: 'preconstruction',
      focus: 'Transit-oriented development'
    }
  },
  {
    id: 'azure-plaza-repositioning',
    name: 'Azure Plaza Repositioning',
    location: 'Austin, TX',
    metadata: {
      stage: 'feasibility',
      focus: 'Retail-to-flex retrofit'
    }
  }
];

const normalizeUnit = (unit: unknown): string => {
  if (typeof unit !== 'string') return '';
  const normalized = unit.toLowerCase();
  if (normalized === 'ft' || normalized === 'm' || normalized === 'in') {
    return normalized;
  }
  return '';
};

const formatMeasurementSummary = (context: Record<string, unknown> | undefined): string | null => {
  if (!context) return null;
  const measurement = context['lastMeasurement'];
  if (!measurement || typeof measurement !== 'object') return null;

  const { type, value, unit, page } = measurement as {
    type?: string;
    value?: number;
    unit?: string;
    page?: number;
  };

  if (!type || typeof value !== 'number') return null;

  const friendlyUnit = normalizeUnit(unit);
  const roundedValue = Math.round((value + Number.EPSILON) * 100) / 100;
  const unitLabel = friendlyUnit ? ` ${friendlyUnit}` : '';
  const measurementType = type === 'area' ? 'area takeoff' : 'linear measurement';
  const pageLabel = typeof page === 'number' ? ` on page ${page + 1}` : '';

  if (type === 'area') {
    return `You just closed an area sketch measuring approximately ${roundedValue}${unitLabel}²${pageLabel}.`;
  }

  return `You captured a ${measurementType} of roughly ${roundedValue}${unitLabel}${pageLabel}.`;
};

const defaultGuidanceActions: GuidanceAction[] = [
  {
    label: 'Draft a takeoff recap',
    prompt: 'Summarize the key findings from this plan review so far.'
  },
  {
    label: 'Call out red flags',
    prompt: 'Highlight potential gaps or risks in the current drawings.'
  },
  {
    label: 'Recommend follow-up tasks',
    prompt: 'What should the team do next to keep momentum on this project?'
  }
];

const generateEmulatedGuidance = (request: GuidanceRequest): GuidanceResponse => {
  const documentName = typeof request.context?.['documentName'] === 'string'
    ? (request.context?.['documentName'] as string)
    : undefined;
  const trigger = typeof request.context?.['trigger'] === 'string'
    ? (request.context?.['trigger'] as string)
    : undefined;

  const measurementSummary = formatMeasurementSummary(request.context);

  const summaryPieces: string[] = [];
  if (documentName) {
    summaryPieces.push(`Working plan set: ${documentName}`);
  }
  if (measurementSummary) {
    summaryPieces.push(measurementSummary.replace(/You /, 'Latest update: you '));
  }

  const historyDepth = request.history?.length ?? 0;
  const recentPrompt = request.history?.slice(-1)[0]?.content ?? request.prompt;
  const trimmedPrompt = recentPrompt.length > 160
    ? `${recentPrompt.slice(0, 157)}...`
    : recentPrompt;

  const intro = `Mudd Guidance Studio synthesised your blueprint activity${documentName ? ` for ${documentName}` : ''}.`;
  const triggerNote = trigger === 'document_opened'
    ? 'Let’s establish a high-level review path before diving into detailed takeoffs.'
    : trigger === 'measurement_completed'
      ? 'I captured your latest measurement and folded it into the running review log.'
      : 'Here’s an updated pulse check based on your latest question.';

  const recommendations: string[] = [];
  if (!measurementSummary) {
    recommendations.push('Establish a baseline measurement to anchor the takeoff and confirm plan scale.');
  } else if (measurementSummary.includes('area')) {
    recommendations.push('Validate that area boundaries align with scope (core vs. shell) before costing.');
    recommendations.push('Flag any overlaps with structural grids that may demand coordination.');
  } else {
    recommendations.push('Document the reference elements used for the measurement in your field notes.');
    recommendations.push('Schedule a follow-up check on adjacent plan sheets for related scope.');
  }
  recommendations.push('Capture outstanding questions and assign owners before the next coordination meeting.');

  return {
    message: `${intro} ${triggerNote}\n\nLatest prompt: "${trimmedPrompt}"`,
    summary: summaryPieces.length > 0 ? summaryPieces.join(' | ') : undefined,
    recommendations,
    actions: defaultGuidanceActions,
    references: [
      historyDepth > 0
        ? `${historyDepth} total prompt${historyDepth === 1 ? '' : 's'} in this session`
        : 'Fresh session started'
    ],
    raw: {
      emulated: true,
      persona: 'Mudd Guidance Studio',
      trigger,
      measurementSummary
    }
  };
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

  if (config.baseUrl && config.apiKey && config.useRemote) {
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

  if (config.artifactDirectory) {
    try {
      const artifactResponse = await loadFromArtifacts<GuidanceResponse | { message?: string }>(
        config.artifactDirectory,
        'guidance'
      );

      return resolveGuidanceResponse(artifactResponse);
    } catch (error) {
      console.warn('Falling back to emulated guidance after artifact load failure.', error);
    }
  }

  return generateEmulatedGuidance(request);
};

export const searchProjects = async (query: string): Promise<ProjectSearchResult[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const config = getConfig();

  if (config.baseUrl && config.apiKey && config.useRemote) {
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

  if (config.artifactDirectory) {
    try {
      const artifactResults = await loadFromArtifacts<{ results?: ProjectSearchResult[] }>(
        config.artifactDirectory,
        'projects'
      );

      if (artifactResults.results) {
        return artifactResults.results.filter((result) =>
          result.name.toLowerCase().includes(trimmedQuery.toLowerCase())
        );
      }
    } catch (error) {
      console.warn('Falling back to emulated project search after artifact load failure.', error);
    }
  }

  const fuzzy = trimmedQuery.toLowerCase();
  return localProjects.filter((project) => {
    const haystacks = [project.name, project.location ?? '', project.metadata?.focus ?? '']
      .join(' ')
      .toLowerCase();
    return haystacks.includes(fuzzy);
  });
};
