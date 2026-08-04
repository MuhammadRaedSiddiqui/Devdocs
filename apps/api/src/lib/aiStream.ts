// apps/api/src/lib/aiStream.ts
// Server-side AI streaming — identical interface to the browser version
// but without dangerouslyAllowBrowser. Runs inside the Express process.
import type { AIProvider } from "@devdocs/shared";

export interface AIConfig {
  provider: AIProvider;
  apiKey:   string;
  model:    string;
  /** Anthropic only — custom API host (proxy / gateway). */
  baseURL?: string;
  /** Anthropic only — bearer token used instead of the x-api-key header. */
  authToken?: string;
}

export interface StreamCallbacks {
  onToken: (accumulated: string) => void;
  onDone:  (fullText: string)    => void;
  onError: (type: string, message: string) => void;
}

export function streamAIResponse(
  systemPrompt: string,
  userMessage:  string,
  config:       AIConfig,
  callbacks:    StreamCallbacks,
  signal?:      AbortSignal
): void {
  if (config.provider === "anthropic") {
    streamAnthropic(systemPrompt, userMessage, config, callbacks, signal);
  } else if (config.provider === "bedrock") {
    streamBedrock(systemPrompt, userMessage, config, callbacks, signal);
  } else {
    streamOpenAI(systemPrompt, userMessage, config, callbacks, signal);
  }
}

async function streamAnthropic(
  systemPrompt: string,
  userMessage:  string,
  config:       AIConfig,
  callbacks:    StreamCallbacks,
  signal?:      AbortSignal
) {
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    // With a bearer token, apiKey must be null — the SDK prefers x-api-key when
    // both are present, which a gateway expecting Authorization would reject.
    const client    = new Anthropic(
      config.authToken
        ? { apiKey: null, authToken: config.authToken, baseURL: config.baseURL }
        : { apiKey: config.apiKey, baseURL: config.baseURL }
    );
    let   accumulated = "";

    const stream = client.messages.stream(
      {
        model:      config.model,
        max_tokens: 2000,
        system:     systemPrompt,
        messages:   [{ role: "user", content: userMessage }],
      },
      { signal }
    );

    stream.on("text", delta => {
      accumulated += delta;
      callbacks.onToken(accumulated);
    });

    await stream.finalMessage();
    callbacks.onDone(accumulated);
  } catch (err: unknown) {
    if (isAbort(err)) return;
    callbacks.onError(...mapAnthropicError(err, config));
  }
}

async function streamOpenAI(
  systemPrompt: string,
  userMessage:  string,
  config:       AIConfig,
  callbacks:    StreamCallbacks,
  signal?:      AbortSignal
) {
  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: config.apiKey });
    let   accumulated = "";

    const stream = await client.chat.completions.create(
      {
        model:      config.model,
        max_tokens: 2000,
        stream:     true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage  },
        ],
      },
      { signal }
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        accumulated += delta;
        callbacks.onToken(accumulated);
      }
    }

    callbacks.onDone(accumulated);
  } catch (err: unknown) {
    if (isAbort(err)) return;
    callbacks.onError(...mapOpenAIError(err));
  }
}

async function streamBedrock(
  systemPrompt: string,
  userMessage:  string,
  config:       AIConfig,
  callbacks:    StreamCallbacks,
  signal?:      AbortSignal
) {
  try {
    const { AnthropicBedrock } = await import("@anthropic-ai/bedrock-sdk");
    const client = new AnthropicBedrock({
      awsAccessKey:  process.env.AWS_ACCESS_KEY_ID!,
      awsSecretKey:  process.env.AWS_SECRET_ACCESS_KEY!,
      awsRegion:     process.env.AWS_REGION ?? "us-east-1",
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
    callbacks.onError(...mapBedrockError(err));
  }
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"));
}

type ErrorTuple = [string, string];

function mapAnthropicError(err: unknown, config?: AIConfig): ErrorTuple {
  const msg    = err instanceof Error ? err.message : String(err);
  // A custom endpoint changes what a failure means: 401 is a bad server-side
  // token or misconfigured gateway, not the user's key.
  const custom = !!config?.baseURL || !!config?.authToken;
  const target = custom ? "the configured Anthropic endpoint" : "Anthropic";

  if (msg.includes("401") || msg.includes("403") || msg.includes("authentication"))
    return ["auth", custom
      ? "Authentication failed at the configured Anthropic endpoint. Check ANTHROPIC_AUTH_TOKEN and ANTHROPIC_BASE_URL."
      : "Anthropic API key invalid or revoked."];
  if (msg.includes("404") && custom)
    return ["unknown",    "Anthropic endpoint returned 404. ANTHROPIC_BASE_URL should be the API root, without /v1."];
  if (msg.includes("429") || msg.includes("rate"))
    return ["rate_limit", `Rate limit reached at ${target}. Wait and retry.`];
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("ECONNREFUSED"))
    return ["network",    `Network error reaching ${target}.`];
  return ["unknown", `Anthropic error: ${msg}`];
}

function mapOpenAIError(err: unknown): ErrorTuple {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("401") || msg.includes("Incorrect API key"))
    return ["auth",       "OpenAI API key invalid or revoked."];
  if (msg.includes("429") || msg.includes("rate"))
    return ["rate_limit", "OpenAI rate limit reached. Wait and retry."];
  if (msg.includes("fetch") || msg.includes("network"))
    return ["network",    "Network error reaching OpenAI."];
  return ["unknown", `OpenAI error: ${msg}`];
}

function mapBedrockError(err: unknown): ErrorTuple {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("AccessDenied") || msg.includes("UnrecognizedClientException"))
    return ["auth",       "AWS credentials invalid or Bedrock access not enabled for this model."];
  if (msg.includes("ThrottlingException") || msg.includes("TooManyRequests"))
    return ["rate_limit", "Bedrock rate limit reached. Wait a moment and try again."];
  if (msg.includes("ValidationException") && msg.includes("model"))
    return ["unknown",    "Model not available. Enable it in the AWS Bedrock console."];
  return ["unknown", `Bedrock error: ${msg}`];
}
