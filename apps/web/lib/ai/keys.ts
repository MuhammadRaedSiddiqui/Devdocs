// apps/web/lib/ai/keys.ts
// Server-backed API-key client. Raw keys are submitted once over HTTPS to the
// authenticated API, which verifies, encrypts (AES-256-GCM), and stores them.
// Keys are never returned or persisted in the browser — only masked metadata.
import type { AIProvider } from "@/lib/ai/provider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface StoredKey {
  provider:  AIProvider;
  maskedKey: string;
  createdAt: string;
}

type TokenGetter = () => Promise<string | null>;

async function authHeaders(getToken: TokenGetter): Promise<HeadersInit> {
  const token = await getToken();
  return {
    "content-type": "application/json",
    authorization: token ? `Bearer ${token}` : "",
  };
}

/** List the signed-in user's stored key metadata (masked, never raw). */
export async function fetchKeys(getToken: TokenGetter): Promise<StoredKey[]> {
  const res = await fetch(`${API_BASE}/keys`, { headers: await authHeaders(getToken) });
  if (!res.ok) throw new Error("Failed to load API keys.");
  return (await res.json()) as StoredKey[];
}

/**
 * Submit a raw key for server-side verification and encrypted storage.
 * Returns the masked key on success, or a human-readable error message.
 */
export async function saveKey(
  getToken: TokenGetter,
  provider: AIProvider,
  key: string,
): Promise<{ maskedKey?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/keys`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ provider, key }),
  });
  if (res.status === 201) {
    const data = (await res.json()) as { maskedKey: string };
    return { maskedKey: data.maskedKey };
  }
  const data = (await res.json().catch(() => null)) as { message?: string } | null;
  return { error: data?.message ?? "Failed to save API key." };
}

/** Delete the stored key for a provider. */
export async function deleteKey(getToken: TokenGetter, provider: AIProvider): Promise<boolean> {
  const res = await fetch(`${API_BASE}/keys/${provider}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  return res.ok;
}
