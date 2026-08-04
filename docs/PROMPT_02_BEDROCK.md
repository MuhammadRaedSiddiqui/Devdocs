# Prompt 02 — Amazon Bedrock Provider

Add Amazon Bedrock as a third AI provider option alongside the existing
Anthropic (native) and OpenAI providers. Bedrock is server-side only —
AWS credentials come from environment variables, not from user-supplied keys.

---

## Context

You are working on the DevDocs AI monorepo. The relevant files are:

- `packages/shared/src/types.ts` — `AIProvider` type and `PROVIDER_MODELS`
- `apps/api/src/lib/aiStream.ts` — provider streaming dispatch
- `apps/api/src/routes/ai.ts` — SSE endpoint, key loading logic
- `apps/api/src/routes/keys.ts` — API key vault (Bedrock bypasses this)
- `apps/web/components/settings/ApiKeySection.tsx` — settings UI
- `apps/web/lib/ai/provider.ts` — browser-side provider config

The Anthropic SDK (`@anthropic-ai/sdk`) already ships a Bedrock client via
`@anthropic-ai/sdk/bedrock` — no additional package installs are required.

---

## Part A — Extend the shared types

Update `packages/shared/src/types.ts`:

1. Add `"bedrock"` to the `AIProvider` union:
   ```ts
   export type AIProvider = "anthropic" | "openai" | "bedrock";
   ```

2. Add Bedrock to `PROVIDER_MODELS`:
   ```ts
   export const PROVIDER_MODELS: Record<AIProvider, { default: string; label: string }> = {
     anthropic: { default: "claude-sonnet-4-6",                         label: "Claude Sonnet 4.6" },
     openai:    { default: "gpt-4o",                                     label: "GPT-4o" },
     bedrock:   { default: "anthropic.claude-sonnet-4-5-20251001-v1:0",  label: "Claude via Bedrock" },
   };
   ```

3. Add a Bedrock-specific model constants map for the settings UI dropdown:
   ```ts
   export const BEDROCK_MODELS: { id: string; label: string }[] = [
     { id: "anthropic.claude-sonnet-4-5-20251001-v1:0", label: "Claude Sonnet 4.5" },
     { id: "anthropic.claude-haiku-4-5-20251001-v1:0",  label: "Claude Haiku 4.5" },
     { id: "anthropic.claude-3-5-sonnet-20241022-v2:0", label: "Claude 3.5 Sonnet" },
     { id: "anthropic.claude-3-5-haiku-20241022-v1:0",  label: "Claude 3.5 Haiku" },
   ];
   ```

---

## Part B — Server-side streaming (apps/api)

Update `apps/api/src/lib/aiStream.ts`:

1. Add a `streamBedrock` function after the existing `streamOpenAI` function:

   ```ts
   async function streamBedrock(
     systemPrompt: string,
     userMessage:  string,
     config:       AIConfig,
     callbacks:    StreamCallbacks,
     signal?:      AbortSignal
   ) {
     try {
       // AnthropicBedrock is a named export from the SDK's bedrock subpath.
       // It authenticates via AWS env vars — not via an apiKey field.
       const { AnthropicBedrock } = await import("@anthropic-ai/sdk/bedrock");
       const client = new AnthropicBedrock({
         awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
         awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
         awsRegion:    process.env.AWS_REGION ?? "us-east-1",
         // Optional: if using a cross-region inference profile, set this instead
         // awsSessionToken: process.env.AWS_SESSION_TOKEN,
       });

       let accumulated = "";

       const stream = client.messages.stream(
         {
           model:      config.model,
           max_tokens: 2000,
           system:     systemPrompt,
           messages:   [{ role: "user", content: userMessage }],
         },
         { signal }
       );

       stream.on("text", (delta: string) => {
         accumulated += delta;
         callbacks.onToken(accumulated);
       });

       await stream.finalMessage();
       callbacks.onDone(accumulated);
     } catch (err: unknown) {
       if (isAbort(err)) return;
       const msg = err instanceof Error ? err.message : String(err);
       // Map common Bedrock errors to recognisable types
       if (msg.includes("AccessDenied") || msg.includes("UnrecognizedClientException"))
         return callbacks.onError("auth",    "AWS credentials invalid or Bedrock access not enabled for this model.");
       if (msg.includes("ThrottlingException") || msg.includes("TooManyRequests"))
         return callbacks.onError("rate_limit", "Bedrock rate limit reached. Wait a moment and try again.");
       if (msg.includes("ValidationException") && msg.includes("model"))
         return callbacks.onError("unknown",  "Model not available. Enable it in the AWS Bedrock console.");
       callbacks.onError("unknown", `Bedrock error: ${msg}`);
     }
   }
   ```

2. Update the `streamAIResponse` dispatch function to include Bedrock:
   ```ts
   export function streamAIResponse(
     systemPrompt: string,
     userMessage:  string,
     config:       AIConfig,
     callbacks:    StreamCallbacks,
     signal?:      AbortSignal
   ): void {
     if      (config.provider === "anthropic") streamAnthropic(systemPrompt, userMessage, config, callbacks, signal);
     else if (config.provider === "openai")    streamOpenAI   (systemPrompt, userMessage, config, callbacks, signal);
     else if (config.provider === "bedrock")   streamBedrock  (systemPrompt, userMessage, config, callbacks, signal);
     else callbacks.onError("unknown", `Unknown provider: ${config.provider}`);
   }
   ```

---

## Part C — Bypass key vault for Bedrock (apps/api/src/routes/ai.ts)

Bedrock authenticates via server env vars, not user-supplied keys.
Update the key-loading block in the `POST /ai/stream` handler:

Find the section that reads:
```ts
// Load and decrypt the user's API key
const apiKey = await loadDecryptedKey(userId, provider);
if (!apiKey) { ... }
```

Replace it with:
```ts
// Bedrock uses server-side AWS credentials — no user key needed
let apiKey: string;
if (provider === "bedrock") {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    res.status(400).json({
      error:   "bedrock_not_configured",
      message: "Amazon Bedrock is not configured on this server. Ask your admin to add AWS credentials.",
    });
    return;
  }
  // Sentinel value — AnthropicBedrock reads directly from env vars, not from this field
  apiKey = "bedrock-env";
} else {
  const key = await loadDecryptedKey(userId, provider);
  if (!key) {
    res.status(400).json({
      error:   "no_key",
      message: `No ${provider} API key found. Add it in Settings → API Key.`,
    });
    return;
  }
  apiKey = key;
}
```

Also update the model resolution to read from env if set, enabling the model
to be overridden per-deployment without a code change:
```ts
const model = provider === "bedrock"
  ? (process.env.AWS_BEDROCK_MODEL ?? PROVIDER_MODELS.bedrock.default)
  : PROVIDER_MODELS[provider].default;

const config = { provider, apiKey, model };
```

---

## Part D — Add a Bedrock health-check endpoint

Add to `apps/api/src/routes/ai.ts`:

```ts
// GET /ai/bedrock-status — returns whether Bedrock is configured on this server.
// Called by the settings UI to show the correct Bedrock connection indicator.
// No auth required — this only reveals whether env vars are set, not their values.
router.get("/bedrock-status", (_req, res) => {
  const configured = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
  res.json({
    configured,
    region: configured ? (process.env.AWS_REGION ?? "us-east-1") : null,
    model:  configured ? (process.env.AWS_BEDROCK_MODEL ?? PROVIDER_MODELS.bedrock.default) : null,
  });
});
```

---

## Part E — Environment variables (apps/api)

Add to `apps/api/.env.example`:
```
# ── Amazon Bedrock (optional — server-side only, not user-configurable) ──────
# Required: IAM user or role with AmazonBedrockFullAccess or a custom policy
# that allows bedrock:InvokeModelWithResponseStream on the target model ARNs.
#
# You MUST also enable model access in the AWS Bedrock console:
# https://console.aws.amazon.com/bedrock → Model access → Enable the models you want
#
# Using an EC2/ECS IAM role? Leave AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
# blank — the SDK will automatically pick up the instance/task role credentials.
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Optional: override the default Bedrock model without a code change.
# Default: anthropic.claude-sonnet-4-5-20251001-v1:0
# AWS_BEDROCK_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0
```

---

## Part F — Settings UI (apps/web)

Update `apps/web/components/settings/ApiKeySection.tsx`:

1. **On mount**, call `GET /api/ai/bedrock-status` (via the `/api` prefix which
   Next.js rewrites to Express in development) and store the result:
   ```ts
   const [bedrockStatus, setBedrockStatus] = useState<{
     configured: boolean; region: string | null; model: string | null;
   } | null>(null);

   useEffect(() => {
     fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/bedrock-status`)
       .then(r => r.json())
       .then(setBedrockStatus)
       .catch(() => setBedrockStatus({ configured: false, region: null, model: null }));
   }, []);
   ```

2. **In the Active Provider selector**, add a Bedrock option after the Anthropic
   and OpenAI options. It should be non-interactive if Bedrock is not configured:

   ```tsx
   {/* Bedrock option in the active provider selector */}
   <button
     type="button"
     disabled={!bedrockStatus?.configured}
     onClick={() => bedrockStatus?.configured && handleSetActiveProvider("bedrock")}
     className={`flex items-center justify-between p-3.5 rounded-lg border text-left transition-colors ${
       activeProvider === "bedrock" && bedrockStatus?.configured
         ? "border-ink bg-white"
         : bedrockStatus?.configured
         ? "border-vellum-border bg-vellum hover:border-ink/30"
         : "border-vellum-border-light bg-vellum opacity-50 cursor-not-allowed"
     }`}
   >
     <div>
       <div className="text-[13px] font-medium text-ink">Amazon Bedrock</div>
       <div className="text-[11px] text-ink-faint mt-0.5">
         {bedrockStatus?.configured
           ? `${bedrockStatus.region} · ${bedrockStatus.model?.split(".").pop()?.replace(/-v\d+:\d+$/, "") ?? "Claude"}`
           : "Not configured on this server"}
       </div>
     </div>
     <div className="flex items-center gap-2 flex-shrink-0 ml-4">
       {bedrockStatus?.configured ? (
         <>
           {activeProvider === "bedrock" && (
             <span className="text-[10px] px-2 py-0.5 rounded-full font-medium badge-green">Active</span>
           )}
           <span className="text-[10px] px-2 py-0.5 rounded-full font-medium badge-amber">Server</span>
         </>
       ) : (
         <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#ece9e1] text-ink-muted">
           Not configured
         </span>
       )}
       <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
         activeProvider === "bedrock" && bedrockStatus?.configured ? "border-ink" : "border-vellum-border"
       }`}>
         {activeProvider === "bedrock" && bedrockStatus?.configured && (
           <div className="w-2 h-2 rounded-full bg-ink"/>
         )}
       </div>
     </div>
   </button>
   ```

3. **Add a Bedrock info card** below the key cards — shown regardless of
   connection state so developers know the option exists:

   ```tsx
   <Card title="Amazon Bedrock" sub="Use Claude via AWS infrastructure — server-configured only.">
     {bedrockStatus?.configured ? (
       <div className="flex gap-2.5 p-3.5 rounded-lg border-l-[3px]"
            style={{ borderLeftColor: "#0F6E56", background: "#F0FDFA" }}>
         <span className="text-sm flex-shrink-0">✓</span>
         <div className="text-[12.5px] leading-snug" style={{ color: "#0a4a3d" }}>
           <strong className="font-medium">Bedrock is configured.</strong> Using region{" "}
           <code className="font-mono text-[11px]">{bedrockStatus.region}</code> with model{" "}
           <code className="font-mono text-[11px]">{bedrockStatus.model}</code>.
           <br/>To change the model, update <code className="font-mono text-[11px]">AWS_BEDROCK_MODEL</code>{" "}
           in your server environment.
         </div>
       </div>
     ) : (
       <div className="flex gap-2.5 p-3.5 rounded-lg border-l-[3px]"
            style={{ borderLeftColor: "#dedcd1", background: "#faf9f5" }}>
         <span className="text-sm flex-shrink-0 text-ink-faint">○</span>
         <div className="text-[12.5px] leading-snug text-ink-muted">
           Bedrock is not configured on this server. Add{" "}
           <code className="font-mono text-[11px]">AWS_ACCESS_KEY_ID</code>,{" "}
           <code className="font-mono text-[11px]">AWS_SECRET_ACCESS_KEY</code>, and{" "}
           <code className="font-mono text-[11px]">AWS_REGION</code> to your API environment,
           then enable model access in the{" "}
           <a href="https://console.aws.amazon.com/bedrock" target="_blank" rel="noreferrer"
              className="text-ink underline">AWS Bedrock console</a>.
         </div>
       </div>
     )}
   </Card>
   ```

4. **Update the BYOK callout** at the top of the page to mention Bedrock:
   Replace "All AI calls go directly from your browser to Anthropic or OpenAI."
   with:
   "Anthropic and OpenAI calls go directly from your browser to the provider.
   Bedrock calls are made from the server using AWS credentials — your AWS keys
   are never stored in this browser."

---

## Part G — Update browser-side provider config (apps/web/lib/ai/provider.ts)

1. Add `"bedrock"` to the `AIProvider` type (it's imported from `@devdocs/shared`
   now, so this change propagates automatically — no separate update needed here).

2. Add Bedrock to `PROVIDER_MODELS` (same — already in shared types).

3. Add Bedrock to `STORAGE_KEYS` with an empty string value (it has no key to store):
   ```ts
   export const STORAGE_KEYS: Record<AIProvider, string> = {
     anthropic: "devdocs_anthropic_key",
     openai:    "devdocs_openai_key",
     bedrock:   "", // no key — uses server env vars
   };
   ```

4. Update `getActiveConfig()` — when the active provider is Bedrock, return a
   config with a sentinel apiKey instead of reading from localStorage:
   ```ts
   export function getActiveConfig(): AIProviderConfig | null {
     if (typeof window === "undefined") return null;
     const provider = (localStorage.getItem(ACTIVE_PROVIDER_KEY) ?? "anthropic") as AIProvider;
     if (provider === "bedrock") {
       // Bedrock has no client-side key — the API server uses its own AWS credentials.
       // Return a config with a sentinel apiKey so the store knows Bedrock is selected.
       return { provider: "bedrock", apiKey: "bedrock-server", model: PROVIDER_MODELS.bedrock.default };
     }
     const apiKey = localStorage.getItem(STORAGE_KEYS[provider]);
     if (!apiKey) return null;
     return { provider, apiKey, model: PROVIDER_MODELS[provider].default };
   }
   ```

5. Update `verifyProviderKey()` — Bedrock cannot be verified from the browser.
   Add a guard at the top:
   ```ts
   export async function verifyProviderKey(
     provider: AIProvider,
     apiKey:   string
   ): Promise<string | null> {
     if (provider === "bedrock") {
       return "Bedrock uses server-side AWS credentials and cannot be verified from the browser.";
     }
     // ... existing Anthropic and OpenAI verification logic unchanged
   }
   ```

---

## Part H — IAM policy (documentation, not code)

Add a comment block to `apps/api/.env.example` and to the monorepo `README.md`
explaining the minimum IAM policy required:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvoke",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
      ]
    }
  ]
}
```

Note in the README: cross-region inference profiles require an additional
resource ARN in the format:
`arn:aws:bedrock:us-east-1:ACCOUNT_ID:inference-profile/us.anthropic.claude-*`

---

## Summary of files changed

| Action | File |
|---|---|
| Update | `packages/shared/src/types.ts` — add `"bedrock"` to AIProvider, PROVIDER_MODELS, add BEDROCK_MODELS |
| Update | `apps/api/src/lib/aiStream.ts` — add `streamBedrock()`, update dispatch |
| Update | `apps/api/src/routes/ai.ts` — bypass key vault for Bedrock, add `/bedrock-status` endpoint |
| Update | `apps/api/.env.example` — add AWS_* vars |
| Update | `apps/web/components/settings/ApiKeySection.tsx` — Bedrock status card + active provider option |
| Update | `apps/web/lib/ai/provider.ts` — add `"bedrock"` to STORAGE_KEYS, update getActiveConfig(), guard verifyProviderKey() |
| Update | `README.md` — add IAM policy and model access instructions |

## No new dependencies required

`@anthropic-ai/sdk` already includes the Bedrock client at the `@anthropic-ai/sdk/bedrock`
subpath. No additional packages needed in either `apps/web` or `apps/api`.

## AWS setup checklist (do this before testing)

1. Create an IAM user or role with the policy above.
2. Go to the AWS Bedrock console → Model access (in your chosen region).
3. Enable the specific Claude models you want to use — each requires individual activation.
4. Add the AWS_* env vars to `apps/api/.env`.
5. Restart the API server.
6. Call `GET http://localhost:4000/ai/bedrock-status` — it should return `{ "configured": true }`.
7. In the DevDocs AI settings page, Bedrock should now show as available in the active provider selector.
