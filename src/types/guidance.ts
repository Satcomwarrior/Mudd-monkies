export type GuidanceRole = 'system' | 'assistant' | 'user';

export interface ConstructGuidanceMessage {
  id: string;
  role: GuidanceRole;
  content: string;
  timestamp: string;
}

export interface ConstructGuidancePayload {
  event: 'pdf_opened' | 'measurement_completed' | 'custom_prompt';
  payload?: Record<string, unknown>;
  history?: ConstructGuidanceMessage[];
}
