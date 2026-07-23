export type AIProvider = 'anthropic' | 'openai';

export interface AIProviderConfig {
  provider: AIProvider;
  projectId: string;
  getToken: () => Promise<string | null>;
}

export const PROVIDER_MODELS: Record<AIProvider, { default: string; label: string }> = {
  anthropic: { default: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  openai: { default: 'gpt-4o', label: 'GPT-4o' },
};

export const ACTIVE_PROVIDER_KEY = 'devdocs_active_provider';
let session: { projectId: string; getToken: () => Promise<string | null> } | null = null;

export function setAISession(projectId: string, getToken: () => Promise<string | null>) {
  session = { projectId, getToken };
}

export function getActiveConfig(): AIProviderConfig | null {
  if (typeof window === 'undefined' || !session) return null;
  const provider = (localStorage.getItem(ACTIVE_PROVIDER_KEY) ?? 'anthropic') as AIProvider;
  return { provider, ...session };
}
