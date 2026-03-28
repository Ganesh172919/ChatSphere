import type { AIModel } from '../api/ai';

const PROVIDER_ORDER = ['gemini', 'openrouter', 'groq', 'together', 'grok', 'huggingface', 'fallback'];

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini Direct',
  openrouter: 'OpenRouter',
  groq: 'Groq',
  together: 'Together AI',
  grok: 'xAI Grok Direct',
  huggingface: 'Hugging Face',
  fallback: 'Fallback',
};

export interface AIModelGroup {
  provider: string;
  label: string;
  models: AIModel[];
}

function compareProviders(left: string, right: string) {
  const leftIndex = PROVIDER_ORDER.indexOf(left);
  const rightIndex = PROVIDER_ORDER.indexOf(right);
  const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
  const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

  if (normalizedLeft !== normalizedRight) {
    return normalizedLeft - normalizedRight;
  }

  return left.localeCompare(right);
}

export function getModelGroups(models: AIModel[]): AIModelGroup[] {
  const grouped = new Map<string, AIModel[]>();

  models.forEach((model) => {
    const current = grouped.get(model.provider) || [];
    current.push(model);
    grouped.set(model.provider, current);
  });

  return Array.from(grouped.entries())
    .sort(([left], [right]) => compareProviders(left, right))
    .map(([provider, providerModels]) => ({
      provider,
      label: PROVIDER_LABELS[provider] || provider,
      models: [...providerModels].sort((left, right) => left.label.localeCompare(right.label)),
    }));
}
