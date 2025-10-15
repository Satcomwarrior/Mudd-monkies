import type { ConstructGuidanceMessage } from '@/types/guidance';

const BASE_URL = process.env.CONSTRUCTCONNECT_BASE_URL;
const API_KEY = process.env.CONSTRUCTCONNECT_API_KEY;
const ARTIFACT_DIR = process.env.CONSTRUCTCONNECT_ARTIFACT_DIR;

export interface FetchGuidanceParams {
  event: 'pdf_opened' | 'measurement_completed' | 'custom_prompt';
  payload?: Record<string, unknown>;
  history?: ConstructGuidanceMessage[];
}

export interface ConstructGuidanceResponse {
  messages: ConstructGuidanceMessage[];
  artifacts?: Array<{ name: string; url?: string; summary?: string }>;
}

export class ConstructConnectConfigurationError extends Error {}

function assertConfiguration() {
  if (!BASE_URL) {
    throw new ConstructConnectConfigurationError(
      'CONSTRUCTCONNECT_BASE_URL is not configured. Please set the environment variable to your AI guidance endpoint.'
    );
  }

  if (!API_KEY) {
    throw new ConstructConnectConfigurationError(
      'CONSTRUCTCONNECT_API_KEY is not configured. Please set the environment variable to your ConstructConnect credential.'
    );
  }

  if (!ARTIFACT_DIR) {
    throw new ConstructConnectConfigurationError(
      'CONSTRUCTCONNECT_ARTIFACT_DIR is not configured. Point it at the directory containing your proprietary guidance artifacts.'
    );
  }
}

export async function fetchGuidance(
  params: FetchGuidanceParams
): Promise<ConstructGuidanceResponse> {
  assertConfiguration();

  const response = await fetch(`${BASE_URL}/guidance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ ...params, artifactDir: ARTIFACT_DIR }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `ConstructConnect guidance request failed (${response.status}): ${text || response.statusText}`
    );
  }

  const data = (await response.json()) as ConstructGuidanceResponse;

  if (!Array.isArray(data.messages)) {
    throw new Error('Invalid guidance response received from ConstructConnect endpoint.');
  }

  return data;
}
