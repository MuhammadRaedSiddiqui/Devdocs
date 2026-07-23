import type { AIProviderConfig } from '@/lib/ai/provider';
import type { DomainId } from '@/lib/types';

export type StreamErrorType = 'auth' | 'rate_limit' | 'timeout' | 'network' | 'unknown';
export interface StreamCallbacks { onToken: (text: string) => void; onDone: (text: string) => void; onError: (type: StreamErrorType, message: string) => void; }

export async function streamAIResponse(
  _systemPrompt: string, userMessage: string, config: AIProviderConfig & { domainId: DomainId }, callbacks: StreamCallbacks, signal?: AbortSignal,
): Promise<void> {
  try {
    const token = await config.getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/ai/stream`, {
      method: 'POST', signal, headers: { 'content-type': 'application/json', authorization: token ? `Bearer ${token}` : '' },
      body: JSON.stringify({ projectId: config.projectId, domainId: config.domainId, userMessage, provider: config.provider }),
    });
    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      callbacks.onError(response.status === 401 ? 'auth' : 'unknown', payload?.message ?? 'Unable to start AI generation.'); return;
    }
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n'); buffer = events.pop() ?? '';
      for (const event of events) {
        const line = event.split('\n').find(x => x.startsWith('data: ')); if (!line) continue;
        const data = JSON.parse(line.slice(6)) as { type: string; text?: string; errorType?: StreamErrorType; message?: string };
        if (data.type === 'token' && data.text) callbacks.onToken(data.text);
        if (data.type === 'done') callbacks.onDone(data.text ?? '');
        if (data.type === 'error') callbacks.onError(data.errorType ?? 'unknown', data.message ?? 'AI generation failed.');
      }
    }
  } catch (error) {
    if (signal?.aborted) return;
    callbacks.onError('network', error instanceof Error ? error.message : 'Network error.');
  }
}
