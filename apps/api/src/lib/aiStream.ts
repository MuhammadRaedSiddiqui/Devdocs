// apps/api/src/lib/aiStream.ts
// Server-side AI streaming — identical interface to the browser version
// but without dangerouslyAllowBrowser. Runs inside the Express process.
import type { AIProvider } from "@devdocs/shared";

export interface AIConfig {
  provider: AIProvider;
  apiKey:   string;
  model:    string;
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
  } else if (config.provider === "metamuse") {
    streamMetaMuse(systemPrompt, userMessage, config, callbacks, signal);
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
    const client    = new Anthropic({ apiKey: config.apiKey });
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
    callbacks.onError(...mapAnthropicError(err));
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

async function streamMetaMuse(
  systemPrompt: string,
  userMessage:  string,
  config:       AIConfig,
  callbacks:    StreamCallbacks,
  signal?:      AbortSignal
) {
  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: "https://api.meta.ai/v1",
    });
    let accumulated = "";

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
    callbacks.onError(...mapMetaMuseError(err));
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

function mapAnthropicError(err: unknown): ErrorTuple {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("401") || msg.includes("authentication"))
    return ["auth",       "Anthropic API key invalid or revoked."];
  if (msg.includes("429") || msg.includes("rate"))
    return ["rate_limit", "Anthropic rate limit reached. Wait and retry."];
  if (msg.includes("fetch") || msg.includes("network"))
    return ["network",    "Network error reaching Anthropic."];
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

function mapMetaMuseError(err: unknown): ErrorTuple {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("401") || msg.includes("Incorrect API key"))
    return ["auth",       "Meta Muse API key invalid or revoked."];
  if (msg.includes("429") || msg.includes("rate"))
    return ["rate_limit", "Meta Muse rate limit reached. Wait and retry."];
  if (msg.includes("fetch") || msg.includes("network"))
    return ["network",    "Network error reaching Meta Muse."];
  return ["unknown", `Meta Muse error: ${msg}`];
}
