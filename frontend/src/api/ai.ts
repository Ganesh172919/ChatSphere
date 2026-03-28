import api from './axios';

export interface AIModel {
  id: string;
  label: string;
  provider: string;
  supportsFiles: boolean;
}

export interface SmartReplySuggestions {
  suggestions: string[];
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'excited' | 'confused' | 'angry';
  confidence: number;
  emoji: string;
}

export interface GrammarResult {
  corrected: string | null;
  suggestions: string[];
}

export interface AvailableModelsResponse {
  models: AIModel[];
  defaultModelId: string;
  hasConfiguredModels?: boolean;
  emptyStateMessage?: string;
}

export async function fetchAvailableModels(): Promise<AvailableModelsResponse> {
  const { data } = await api.get<AvailableModelsResponse>('/ai/models');
  return data;
}

export async function getSmartReplies(
  messages: Array<{ username?: string; role?: string; content: string }>,
  context?: string,
  modelId?: string
): Promise<SmartReplySuggestions> {
  const { data } = await api.post<SmartReplySuggestions>('/ai/smart-replies', { messages, context, modelId });
  return data;
}

export async function analyzeSentiment(text: string, modelId?: string): Promise<SentimentAnalysis> {
  const { data } = await api.post<SentimentAnalysis>('/ai/sentiment', { text, modelId });
  return data;
}

export async function checkGrammar(text: string, modelId?: string): Promise<GrammarResult> {
  const { data } = await api.post<GrammarResult>('/ai/grammar', { text, modelId });
  return data;
}
