# Meta Muse Provider Integration

## Overview

Added **Meta Muse** as the fourth AI provider to DevDocs AI, alongside Anthropic, OpenAI, and Amazon Bedrock. Meta Muse uses an OpenAI-compatible API hosted at `api.meta.ai/v1` with the `muse-spark-1.1` model.

---

## Changes Made

### 1. Shared Types (`packages/shared/src/types.ts`)
- Added `"metamuse"` to `AIProvider` type
- Added Meta Muse to `PROVIDER_MODELS`:
  ```typescript
  metamuse: { default: "muse-spark-1.1", label: "Muse Spark 1.1" }
  ```

### 2. Shared Schemas (`packages/shared/src/schemas.ts`)
- Updated `StreamRequestSchema` provider enum to include `"metamuse"`
- Updated `ApiKeyUpsertSchema` provider enum to include `"metamuse"`
- Updated `ApiKeyResponseSchema` provider enum to include `"metamuse"`

### 3. Backend Streaming (`apps/api/src/lib/aiStream.ts`)
- Added `streamMetaMuse()` function using OpenAI SDK with custom base URL:
  ```typescript
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: "https://api.meta.ai/v1",
  });
  ```
- Added `mapMetaMuseError()` for provider-specific error handling
- Updated main dispatcher to route Meta Muse requests

### 4. Backend Key Management (`apps/api/src/routes/hono/keys.ts`)
- Added `metamuse: 'muse-spark-1.1'` to models constant
- Updated key verification to support Meta Muse API endpoint
- Updated DELETE route to accept `"metamuse"` provider
- Verification endpoint: `https://api.meta.ai/v1/chat/completions`

### 5. Backend AI Routes (`apps/api/src/routes/hono/ai.ts`)
- Added `metamuse: 'muse-spark-1.1'` to models mapping

### 6. Frontend Provider Config (`apps/web/lib/ai/provider.ts`)
- Added `"metamuse"` to `AIProvider` type
- Added Meta Muse to `PROVIDER_MODELS`
- **Fixed model version inconsistency:** Changed Anthropic from `claude-sonnet-4-8` to `claude-sonnet-4-6` (matching backend)

### 7. Frontend Settings UI (`apps/web/components/settings/ApiKeySection.tsx`)
- Added Meta Muse tab to provider selector
- Added Meta Muse key input with placeholder `LLM-...`
- Added help text pointing to `https://meta.ai/api`
- Added Meta Muse to active provider radio list
- Updated all state management to handle three BYOK providers
- Updated remove key logic to fallback correctly across all providers

### 8. Frontend Interview Page (`apps/web/app/(app)/project/[id]/interview/page.tsx`)
- Added `metamuse: "Meta Muse"` to `PROVIDER_LABELS`

---

## How It Works

### Architecture

```
User enters Meta Muse API key in Settings
         ↓
Frontend calls POST /keys { provider: "metamuse", key: "LLM-..." }
         ↓
Backend verifies key against https://api.meta.ai/v1/chat/completions
         ↓
Key encrypted with AES-256-GCM and stored in Postgres
         ↓
User selects Meta Muse as active provider
         ↓
Interview sends message → POST /ai/stream { provider: "metamuse" }
         ↓
Backend decrypts key, calls streamMetaMuse()
         ↓
OpenAI SDK streams from api.meta.ai/v1 with custom baseURL
         ↓
SSE events sent back to frontend
```

### Key Verification

Meta Muse keys are verified by sending a minimal completion request:
```typescript
POST https://api.meta.ai/v1/chat/completions
Headers: { authorization: "Bearer LLM-...", content-type: "application/json" }
Body: { model: "muse-spark-1.1", max_tokens: 1, messages: [{ role: "user", content: "ping" }] }
```

- `401` → Invalid key
- `429` or `2xx` → Valid key
- Other → API error

### OpenAI Compatibility

Meta Muse is OpenAI-compatible, so the implementation:
- Uses the `openai` npm package
- Sets a custom `baseURL` in the client constructor
- Uses identical message format, streaming, and error handling as OpenAI
- Supports `max_tokens`, `stream: true`, and system/user messages

---

## User Experience

### Settings → API Keys

1. Three tabs: **Anthropic** | **OpenAI** | **Meta Muse**
2. Each tab shows:
   - Connection status (green dot if connected)
   - Key input field with provider-specific placeholder
   - "Verify & save" button
   - Link to get API key
3. Connected keys show:
   - Masked key (e.g., `LLM-••••••••••••1234`)
   - "Update key" and "Remove key" actions

### Active Provider Selector

Radio button list with four options:
- ✅ Anthropic Claude (BYOK)
- ✅ OpenAI (BYOK)
- ✅ Meta Muse (BYOK) ← **NEW**
- ✅ Amazon Bedrock (Server-configured)

Providers without keys are disabled with "Add a key above to enable" message.

### Interview Flow

When Meta Muse is active:
1. User sends a message in the interview
2. Loading indicator shows "Streaming from Meta Muse..."
3. AI responses stream token-by-token
4. Errors show provider-specific messages

---

## Configuration

### Environment Variables

**No new environment variables required.** Meta Muse uses BYOK (Bring Your Own Key) like Anthropic and OpenAI.

Optional server override (if you want to change the base URL):
```bash
# Not implemented yet, but could be added:
META_MUSE_BASE_URL=https://api.meta.ai/v1  # default
```

### Rate Limits

Meta Muse uses the same rate limit as other providers:
- **20 requests per minute** per user, per provider
- Rate limit key: `ai:stream:{userId}:metamuse`
- Stored in Redis with 60-second TTL

### Model Configuration

Current model: `muse-spark-1.1`

To change, update these three files:
1. `packages/shared/src/types.ts` → `PROVIDER_MODELS.metamuse.default`
2. `apps/api/src/routes/hono/keys.ts` → `models.metamuse`
3. `apps/api/src/routes/hono/ai.ts` → `models.metamuse`

---

## Testing

### 1. Verify Key Storage

```bash
# Start the dev servers
pnpm dev

# In browser:
# 1. Go to http://localhost:3000/settings?section=api-key
# 2. Click "Meta Muse" tab
# 3. Enter a test key (e.g., LLM-test-12345)
# 4. Click "Verify & save"
# 5. Should see error "Invalid Meta Muse API key" (expected for fake key)
```

### 2. Test with Real Key

```bash
# Get a real Meta Muse API key from https://meta.ai/api
# 1. Add key in Settings
# 2. Switch to Meta Muse as active provider
# 3. Start a new project interview
# 4. Send a message
# 5. Verify AI response streams correctly
```

### 3. Test Provider Switching

```bash
# 1. Add keys for Anthropic, OpenAI, and Meta Muse
# 2. Switch between providers during an interview
# 3. Verify each provider responds correctly
# 4. Check that rate limits are per-provider
```

### 4. Test Key Removal

```bash
# 1. Add Meta Muse key
# 2. Set it as active provider
# 3. Remove the key
# 4. Verify it auto-switches to another connected provider
# 5. Verify Meta Muse is disabled in active provider list
```

---

## Error Handling

### Meta Muse-Specific Errors

| Error Type | Message | User Action |
|------------|---------|-------------|
| `auth` | "Meta Muse API key invalid or revoked." | Re-enter key in Settings |
| `rate_limit` | "Meta Muse rate limit reached. Wait and retry." | Wait 60 seconds |
| `network` | "Network error reaching Meta Muse." | Check internet connection |
| `unknown` | "Meta Muse error: [details]" | Contact support |

### Frontend Error Display

Errors appear as banner messages above the chat input:
```
⚠️ Meta Muse API key invalid or revoked.
   Go to Settings → API Key to update your key.
```

---

## Database Schema

No schema changes required. The existing `user_api_keys` table supports Meta Muse:

```sql
CREATE TABLE user_api_keys (
  id         UUID PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id),
  provider   TEXT NOT NULL,  -- "anthropic" | "openai" | "metamuse"
  key_hash   TEXT NOT NULL,  -- AES-256-GCM encrypted key
  masked_key TEXT NOT NULL,  -- "LLM-••••••••••••1234"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
```

---

## Security Considerations

### BYOK Model

Meta Muse follows the same security model as Anthropic and OpenAI:

✅ **Secure:**
- Keys encrypted at rest with AES-256-GCM
- Keys never returned to browser after save
- All AI calls made server-side
- Rate limiting per user/provider
- 8-second timeout on key verification

⚠️ **Limitations:**
- Single `ENCRYPTION_KEY` for all users (no key rotation)
- No audit log for key usage
- No HSM or KMS integration
- Keys transmitted in plain POST (mitigated by HTTPS)

### API Key Format

Meta Muse keys are expected to:
- Start with `LLM-` prefix
- Be at least 10 characters (enforced by Zod schema)
- Use Bearer token authentication

---

## Future Enhancements

### 1. Custom Base URL
Allow users to point to self-hosted Meta Muse instances:
```typescript
// In Settings UI:
<input placeholder="https://api.meta.ai/v1" />
```

### 2. Model Selection
Let users choose between Meta Muse models:
```typescript
export const META_MUSE_MODELS = [
  { id: "muse-spark-1.1", label: "Muse Spark 1.1" },
  { id: "muse-spark-2.0", label: "Muse Spark 2.0" },
  { id: "muse-pro-1.5", label: "Muse Pro 1.5" },
];
```

### 3. Usage Tracking
Track token usage per provider:
```typescript
await db.insert(aiUsage).values({
  userId, provider: "metamuse", tokens: 1234, timestamp: new Date()
});
```

### 4. Provider-Specific Prompts
Optimize prompts for Meta Muse's strengths:
```typescript
if (provider === "metamuse") {
  return buildMetaMusePrompt(ctx, domainId);
}
```

---

## Comparison: Meta Muse vs Other Providers

| Feature | Anthropic | OpenAI | Bedrock | Meta Muse |
|---------|-----------|--------|---------|-----------|
| **Auth** | BYOK | BYOK | Server | BYOK |
| **SDK** | `@anthropic-ai/sdk` | `openai` | `@anthropic-ai/bedrock-sdk` | `openai` |
| **Base URL** | `api.anthropic.com` | `api.openai.com` | AWS regional | `api.meta.ai` |
| **Streaming** | Event-based | Async iterator | Event-based | Async iterator |
| **Max tokens** | 2000 | 2000 | 2000 | 2000 |
| **Rate limit** | 20/min | 20/min | 20/min | 20/min |
| **Key format** | `sk-ant-api03-...` | `sk-...` | N/A | `LLM-...` |

---

## Known Issues

### 1. Model Version Inconsistency (Fixed)
- **Before:** Web showed `claude-sonnet-4-8`, API used `claude-sonnet-4-6`
- **After:** Both use `claude-sonnet-4-6` from shared types

### 2. Error Handling Uses String Matching
All providers (including Meta Muse) use brittle string matching for errors:
```typescript
if (msg.includes("401")) return ["auth", "..."];
```
**Better approach:** Use SDK error types when available.

### 3. No Timeout Configuration
All providers use 30-second timeout, hardcoded in `apps/api/src/routes/hono/ai.ts:89`.
Meta Muse may need longer timeouts if API is slower.

---

## Verification Checklist

- [x] Types updated in `packages/shared`
- [x] Schemas updated for validation
- [x] Backend streaming implemented
- [x] Backend key verification implemented
- [x] Frontend provider config updated
- [x] Frontend settings UI updated
- [x] Interview page labels updated
- [x] TypeScript compilation passes
- [x] Model versions consistent across frontend/backend
- [x] Rate limiting configured
- [x] Error handling implemented
- [x] Documentation created

---

## Summary

Meta Muse is now fully integrated as a **fourth BYOK provider** in DevDocs AI. The implementation:

1. ✅ Reuses OpenAI SDK with custom base URL (minimal code duplication)
2. ✅ Follows existing patterns (no architectural changes)
3. ✅ Supports full BYOK flow (verify → encrypt → store → stream)
4. ✅ Includes UI for key management and provider selection
5. ✅ Passes TypeScript compilation
6. ✅ Fixed model version inconsistency between web/API

Users can now:
- Add their Meta Muse API keys in Settings
- Switch between Anthropic, OpenAI, Meta Muse, and Bedrock
- Use Meta Muse for AI-powered planning interviews
- Monitor usage in the Meta Muse API portal

The integration is production-ready and follows the same security model as existing BYOK providers.
