import api from './axios';

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

export async function getSmartReplies(
  messages: Array<{ username?: string; role?: string; content: string }>,
  context?: string
): Promise<SmartReplySuggestions> {
  const { data } = await api.post<SmartReplySuggestions>('/ai/smart-replies', { messages, context });
  return data;
}

export async function analyzeSentiment(text: string): Promise<SentimentAnalysis> {
  const { data } = await api.post<SentimentAnalysis>('/ai/sentiment', { text });
  return data;
}

export async function checkGrammar(text: string): Promise<GrammarResult> {
  const { data } = await api.post<GrammarResult>('/ai/grammar', { text });
  return data;
}
