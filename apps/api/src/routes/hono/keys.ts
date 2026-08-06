import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { ApiKeyUpsertSchema, type AIProvider } from '@devdocs/shared';
import { db, userApiKeys } from '../../lib/db';
import { decryptKey, encryptKey, maskKey } from '../../lib/crypto';
import { requireClerkAuth } from '../../middleware/hono-clerk-auth';

// Only the BYOK providers verify keys here. Bedrock is
// server-configured and never stores a user key.
const models = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  metamuse: 'muse-spark-1.1',
} as const;

const app = new Hono();
app.use('*', requireClerkAuth);

app.get('/', async (c) => {
  const rows = await db.select({
    provider: userApiKeys.provider,
    maskedKey: userApiKeys.maskedKey,
    createdAt: userApiKeys.createdAt,
  }).from(userApiKeys).where(eq(userApiKeys.userId, c.get('userId')));
  return c.json(rows);
});

app.post('/', zValidator('json', ApiKeyUpsertSchema), async (c) => {
  const { provider, key } = c.req.valid('json');
  const error = await verifyKey(provider, key);
  if (error) return c.json({ error: 'invalid_key', message: error }, 400);

  const encrypted = encryptKey(key);
  const maskedKey = maskKey(key);
  await db.insert(userApiKeys).values({
    userId: c.get('userId'), provider, keyHash: encrypted, maskedKey,
  }).onConflictDoUpdate({
    target: [userApiKeys.userId, userApiKeys.provider],
    set: { keyHash: encrypted, maskedKey, updatedAt: new Date() },
  });
  return c.json({ provider, maskedKey }, 201);
});

app.delete('/:provider', async (c) => {
  const provider = c.req.param('provider');
  if (provider !== 'anthropic' && provider !== 'openai' && provider !== 'metamuse') {
    return c.json({ error: 'bad_request', message: 'Invalid provider.' }, 400);
  }
  await db.delete(userApiKeys).where(and(
    eq(userApiKeys.userId, c.get('userId')),
    eq(userApiKeys.provider, provider),
  ));
  return c.json({ success: true });
});

export async function loadDecryptedKey(userId: string, provider: AIProvider): Promise<string | null> {
  const row = await db.query.userApiKeys.findFirst({
    where: and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)),
  });
  return row ? decryptKey(row.keyHash) : null;
}

async function verifyKey(provider: AIProvider, key: string): Promise<string | null> {
  try {
    const response = provider === 'anthropic'
      ? await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model: models.anthropic, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
          signal: AbortSignal.timeout(8_000),
        })
      : provider === 'openai'
      ? await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model: models.openai, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
          signal: AbortSignal.timeout(8_000),
        })
      : await fetch('https://api.meta.ai/v1/chat/completions', {
          method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model: models.metamuse, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
          signal: AbortSignal.timeout(8_000),
        });
    if (response.status === 401) return `Invalid ${provider === 'anthropic' ? 'Anthropic' : provider === 'openai' ? 'OpenAI' : 'Meta Muse'} API key.`;
    if (response.status === 429 || response.ok) return null;
    return `${provider === 'anthropic' ? 'Anthropic' : provider === 'openai' ? 'OpenAI' : 'Meta Muse'} API error ${response.status}.`;
  } catch {
    return 'Network error while verifying the API key.';
  }
}

export default app;
