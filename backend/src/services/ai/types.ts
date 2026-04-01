export interface AIChatRequest {
  prompt: string;
  context?: string;
  memory?: Array<{ id: string; summary: string; score: number }>;
  model?: string;
}

export interface AIChatResult {
  provider: string;
  model: string;
  content: string;
  smartReplies: string[];
  insights: string[];
  extractedMemory: string[];
}

export interface AIProvider {
  generate(request: AIChatRequest): Promise<AIChatResult>;
}
