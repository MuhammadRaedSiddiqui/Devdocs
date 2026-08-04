# Prompt 1 (Updated) — Wire Real AI: Anthropic + OpenAI Provider Support

You are working on DevDocs AI — a Next.js 14 App Router project that interviews
developers before they start coding and generates a 10-file documentation bundle.
The stack is Next.js 14, TypeScript, Zustand, Supabase, Tailwind CSS.

All AI calls must be made **client-side directly from the browser** — keys are
stored in localStorage and must never be sent to a DevDocs AI server.

---

## Part A — Abstract the AI provider layer

Create `lib/ai/provider.ts`:

```ts
export type AIProvider = "anthropic" | "openai";

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export const PROVIDER_MODELS: Record<AIProvider, { default: string; label: string }> = {
  anthropic: { default: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  openai:    { default: "gpt-4o",             label: "GPT-4o" },
};

export const STORAGE_KEYS: Record<AIProvider, string> = {
  anthropic: "devdocs_anthropic_key",
  openai:    "devdocs_openai_key",
};

export const ACTIVE_PROVIDER_KEY = "devdocs_active_provider";

export function getActiveConfig(): AIProviderConfig | null {
  const provider = (localStorage.getItem(ACTIVE_PROVIDER_KEY) ?? "anthropic") as AIProvider;
  const apiKey = localStorage.getItem(STORAGE_KEYS[provider]);
  if (!apiKey) return null;
  return { provider, apiKey, model: PROVIDER_MODELS[provider].default };
}
```

---

## Part B — Unified streaming function

Create `lib/ai/stream.ts`:

Install `@anthropic-ai/sdk` and `openai`.

```ts
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AIProviderConfig } from "@/lib/ai/provider";

export interface StreamCallbacks {
  onToken: (accumulated: string) => void;
  onDone: (fullText: string) => void;
  onError: (type: "auth" | "rate_limit" | "timeout" | "network" | "unknown", message: string) => void;
}

export function streamAIResponse(
  systemPrompt: string,
  userMessage: string,
  config: AIProviderConfig,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): void {
  // Dispatch to the right provider — the store calls this single function
  // and never knows which provider is active.
  if (config.provider === "anthropic") {
    streamAnthropic(systemPrompt, userMessage, config, callbacks, signal);
  } else {
    streamOpenAI(systemPrompt, userMessage, config, callbacks, signal);
  }
}
```

**Anthropic streaming** (`streamAnthropic` in the same file):
- Use `new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true })`.
- Call `client.messages.stream({ model: config.model, max_tokens: 2000, system: systemPrompt, messages: [{ role: "user", content: userMessage }] })`.
- Accumulate text deltas from `stream.on("text", ...)`.
- On `stream.finalMessage()` call `callbacks.onDone(fullText)`.
- Map errors: `401` → `"auth"`, `429` → `"rate_limit"`, `AbortError` → ignore (user cancelled), anything else → `"unknown"`.

**OpenAI streaming** (`streamOpenAI` in the same file):
- Use `new OpenAI({ apiKey: config.apiKey, dangerouslyAllowBrowser: true })`.
- Call `client.chat.completions.create({ model: config.model, max_tokens: 2000, stream: true, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }] })`.
- Iterate the async iterable: `for await (const chunk of stream)` — accumulate `chunk.choices[0]?.delta?.content ?? ""`.
- On loop completion call `callbacks.onDone(fullText)`.
- Map errors: `401` → `"auth"`, `429` → `"rate_limit"`, `AbortError` → ignore, anything else → `"unknown"`.

Both functions must respect the `signal` AbortController parameter — pass it
to the SDK call so in-flight requests can be cancelled.

---

## Part C — System prompt builder

Create `lib/ai/systemPrompt.ts`:

```ts
import type { ProjectContext, DomainId } from "@/lib/types";
import { PROJECT_TYPE_LABELS } from "@/lib/types";
import { getDomain } from "@/lib/interview/domains";

export function buildSystemPrompt(
  ctx: ProjectContext,
  domainId: DomainId,
  elaboration: string,
  lockedChoices: Partial<Record<DomainId, Record<string, string>>>
): string {
  const typeLabel = PROJECT_TYPE_LABELS[ctx.projectType];
  const domain = getDomain(domainId);
  const choicesSummary = Object.entries(lockedChoices)
    .map(([d, c]) => `${d}: ${Object.values(c).join(", ")}`)
    .join("\n");

  return `You are a senior software architect helping a developer plan a ${typeLabel} project before writing any code.

PROJECT CONTEXT:
- Type: ${typeLabel}
- Team: ${ctx.teamSize.replace("_", " ")}
- Timeline: ${ctx.timeline.replace(/_/g, " ")}
- Budget: ${ctx.budget}
- Experience: ${ctx.experienceLevel}
${elaboration ? `- Project description: ${elaboration}` : ""}
${choicesSummary ? `\nDECISIONS ALREADY LOCKED:\n${choicesSummary}` : ""}

CURRENT DOMAIN: ${domain.label}

INSTRUCTIONS:
- Be direct and specific. No filler. No "Great question!".
- For open-ended questions: ask exactly one focused question, then wait.
- For document generation: output clean markdown only.
  - Use "## Heading" for section titles.
  - Use "**Label:** value" for key-value pairs.
  - Use backtick code formatting for field names, types, route paths.
  - Do not add preamble or explanation around the markdown.
- Tailor every recommendation to the locked context above.
- When a choice has already been made (see DECISIONS ALREADY LOCKED), never
  re-ask for it. Reference it by name and move forward.`;
}
```

---

## Part D — Update the Zustand store

Update `lib/interview/store.ts`:

1. Replace the mock `streamAIResponse` import and its `setTimeout` implementation
   with a call to the real `streamAIResponse` from `lib/ai/stream.ts`.

2. Add to the store state:
   ```ts
   currentProvider: AIProvider | null;
   abortController: AbortController | null;
   ```

3. Update `runReply()` (internal helper) to:
   - Call `getActiveConfig()` from `lib/ai/provider.ts`.
   - If `null`, push an assistant message: "No API key configured. Add your
     key in Settings → API Key." and return.
   - Build the system prompt using `buildSystemPrompt(ctx, currentDomain, elaboration, lockedChoices)`.
   - Create a new `AbortController`, store it in `store.abortController`.
   - Call `streamAIResponse(systemPrompt, text, config, { onToken, onDone, onError }, controller.signal)`.
   - In `onError`: set `store.lastError = { type, message }`, set
     `isThinking: false, isStreaming: false, streamingText: ""`, push a
     readable assistant error message.
   - In `onDone`: clear `store.abortController = null`.

4. Add a `cancelStream()` action:
   ```ts
   cancelStream: () => {
     get().abortController?.abort();
     set({ abortController: null, isThinking: false, isStreaming: false, streamingText: "" });
   }
   ```

5. Add a 30-second timeout wrapper around every `streamAIResponse` call:
   ```ts
   const timeout = setTimeout(() => {
     get().abortController?.abort();
     // push timeout error message
   }, 30_000);
   // clear timeout in onDone and onError
   ```

---

## Part E — Update the Settings API Key section

Update `components/settings/ApiKeySection.tsx`:

Replace the current single-provider card with a two-provider layout:

1. **Provider tabs** at the top of the card — "Anthropic" | "OpenAI" —
   styled as the same pill tabs used elsewhere (active: `bg-ink text-vellum`,
   inactive: `border border-vellum-border text-ink-muted`).
   Switching tabs changes which provider's key is being managed.

2. **Per-provider status rows** — each provider shows independently:
   - Connected: masked key + last verified timestamp + "Update" / "Remove" buttons.
   - Disconnected: key input field + "Verify & save" button.

3. **Active provider selector** — a separate card section below the key cards:
   - Label: "Which AI powers your interview?"
   - Two radio-chip options styled like the DiscoveryForm chips:
     - "Anthropic Claude" with model `claude-sonnet-4-6`
     - "OpenAI" with model `gpt-4o`
   - Only enabled if the corresponding key is connected.
   - Selecting one writes to `localStorage.setItem(ACTIVE_PROVIDER_KEY, provider)`.
   - Updates `store.currentProvider` via a new `setProvider(p: AIProvider)` action.

4. **Verification** — on "Verify & save" for each provider:
   - **Anthropic**: make a minimal `POST /v1/messages` call with `max_tokens: 1`.
     `401` = invalid key. `429` = valid key, rate limited. Network error = show error.
   - **OpenAI**: make a minimal `POST /v1/chat/completions` call with `max_tokens: 1`.
     Same error mapping.
   - On success: `localStorage.setItem(STORAGE_KEYS[provider], key)`.
     Show "Verified and saved" in the green callout style.

5. **BYOK callout** — update the text to mention both providers:
   "Your API keys are stored only in this browser's localStorage. All AI calls
   go directly from your browser to Anthropic or OpenAI — never through DevDocs
   AI servers."

6. **AI Provider card** (the one that showed "Anthropic Claude — Active" and
   "OpenAI — Coming soon") — remove the "Coming soon" badge from OpenAI now
   that it is supported. Show both as selectable options via the radio chips above.

---

## Part F — Update the store's provider state on startup

Update `app/(app)/project/[id]/interview/page.tsx`:

After loading the project, call:
```ts
const config = getActiveConfig();
if (config) store.setProvider(config.provider);
```

This ensures the context bar shows the correct provider and error messages
reference the right key if something goes wrong mid-interview.

---

## Summary of files to create / update

| Action | File |
|---|---|
| Create | `lib/ai/provider.ts` |
| Create | `lib/ai/stream.ts` |
| Create | `lib/ai/systemPrompt.ts` |
| Update | `lib/interview/store.ts` |
| Update | `components/settings/ApiKeySection.tsx` |
| Update | `app/(app)/project/[id]/interview/page.tsx` |

## Dependencies to install

```bash
npm install @anthropic-ai/sdk openai
```

No other dependencies needed — both SDKs support browser streaming natively
when `dangerouslyAllowBrowser: true` is set.
