export type AIProvider = 'anthropic' | 'openai' | 'bedrock';

export interface AIProviderConfig {
  provider: AIProvider;
  projectId: string;
  getToken: () => Promise<string | null>;
}

export const PROVIDER_MODELS: Record<AIProvider, { default: string; label: string }> = {
  anthropic: { default: 'claude-sonnet-4-8', label: 'Claude Sonnet 4.8' },
  openai: { default: 'gpt-4o', label: 'GPT-4o' },
  bedrock: { default: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0', label: 'Claude via Bedrock' },
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

/**
 * Server-side Anthropic endpoint config, mirroring `GET /ai/anthropic-status`.
 * When `serverManaged` is true the API holds an ANTHROPIC_AUTH_TOKEN, so the
 * Anthropic provider is usable without the user storing their own key.
 */
export interface AnthropicStatus {
  serverManaged: boolean;
  host: string | null;
  model: string | null;
}

export const ANTHROPIC_STATUS_UNSET: AnthropicStatus = {
  serverManaged: false,
  host: null,
  model: null,
};

export async function fetchAnthropicStatus(): Promise<AnthropicStatus> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiBase}/ai/anthropic-status`);
    if (!res.ok) return ANTHROPIC_STATUS_UNSET;
    return (await res.json()) as AnthropicStatus;
  } catch {
    return ANTHROPIC_STATUS_UNSET;
  }
}
