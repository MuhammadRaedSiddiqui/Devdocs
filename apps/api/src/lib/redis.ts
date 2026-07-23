// apps/api/src/lib/redis.ts
// Upstash Redis — serverless Redis with a REST API.
// Used for: per-user rate limit counters and the AI response cache.
// Get credentials at https://console.upstash.com
//
// The client is created lazily so that importing this module never throws when
// the Upstash env vars are absent (e.g. in unit tests). Callers that require
// Redis should handle a null client by degrading gracefully.
import { Redis } from "@upstash/redis";

let client: Redis | null = null;
let resolved = false;

/**
 * Return the shared Redis client, or null when Upstash is not configured.
 * The result is memoised after the first call.
 */
export function getRedis(): Redis | null {
  if (resolved) return client;
  resolved = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    client = null;
    return null;
  }

  client = new Redis({ url, token });
  return client;
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

/** Cache an AI-generated documentation section for 24 hours. */
export async function cacheDocSection(
  projectId: string,
  domainId:  string,
  content:   string
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.setex(`ai:doc:${projectId}:${domainId}`, 86_400, content);
}

/** Return a cached doc section, or null if not cached (or Redis is unconfigured). */
export async function getCachedDocSection(
  projectId: string,
  domainId:  string
): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get<string>(`ai:doc:${projectId}:${domainId}`);
}

/** Invalidate a cached section when the user edits it. */
export async function invalidateDocSection(
  projectId: string,
  domainId:  string
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`ai:doc:${projectId}:${domainId}`);
}
