// apps/web/lib/session/logger.ts
// Client-side session logging for interview interactions
import type {
  CreateSessionRequest,
  LogMessageRequest,
  UpdateSessionRequest,
  InterviewSession,
  SessionTimingData,
  MessageMetadata,
  AIProvider,
  DomainId,
} from "@devdocs/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type TokenGetter = () => Promise<string | null>;

async function authHeaders(getToken: TokenGetter): Promise<HeadersInit> {
  const token = await getToken();
  return {
    "content-type": "application/json",
    authorization: token ? `Bearer ${token}` : "",
  };
}

export class SessionLogger {
  private sessionId: string | null = null;
  private timingData: SessionTimingData = {
    thinkingStartedAt: null,
    streamingStartedAt: null,
    requestStartedAt: null,
  };

  constructor(private getToken: TokenGetter) {}

  /**
   * Start a new interview session
   */
  async startSession(request: CreateSessionRequest): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers: await authHeaders(this.getToken),
        body: JSON.stringify(request),
      });

      if (!res.ok) return null;

      const session = (await res.json()) as InterviewSession;
      this.sessionId = session.id;
      return session.id;
    } catch (error) {
      console.error("Failed to start session:", error);
      return null;
    }
  }

  /**
   * Mark the start of a thinking phase
   */
  startThinking() {
    this.timingData.requestStartedAt = Date.now();
    this.timingData.thinkingStartedAt = Date.now();
  }

  /**
   * Mark the start of streaming phase
   */
  startStreaming() {
    this.timingData.streamingStartedAt = Date.now();
  }

  /**
   * Calculate timing durations
   */
  private calculateTimings() {
    const now = Date.now();
    const { thinkingStartedAt, streamingStartedAt, requestStartedAt } = this.timingData;

    return {
      thinkingDurationMs: streamingStartedAt && thinkingStartedAt
        ? streamingStartedAt - thinkingStartedAt
        : null,
      streamingDurationMs: streamingStartedAt
        ? now - streamingStartedAt
        : null,
      totalDurationMs: requestStartedAt
        ? now - requestStartedAt
        : null,
    };
  }

  /**
   * Log a user message
   */
  async logUserMessage(
    content: string,
    domainId: DomainId,
    metadata: MessageMetadata | null = null
  ): Promise<void> {
    if (!this.sessionId) return;

    try {
      await fetch(`${API_BASE}/sessions/messages`, {
        method: "POST",
        headers: await authHeaders(this.getToken),
        body: JSON.stringify({
          sessionId: this.sessionId,
          role: "user",
          content,
          domainId,
          provider: null,
          thinkingDurationMs: null,
          streamingDurationMs: null,
          totalDurationMs: null,
          tokensUsed: null,
          errorType: null,
          metadata,
        } as LogMessageRequest),
      });
    } catch (error) {
      console.error("Failed to log user message:", error);
    }
  }

  /**
   * Log an assistant message with timing data
   */
  async logAssistantMessage(
    content: string,
    domainId: DomainId,
    provider: AIProvider,
    errorType: string | null = null,
    metadata: MessageMetadata | null = null
  ): Promise<void> {
    if (!this.sessionId) return;

    const timings = this.calculateTimings();

    try {
      await fetch(`${API_BASE}/sessions/messages`, {
        method: "POST",
        headers: await authHeaders(this.getToken),
        body: JSON.stringify({
          sessionId: this.sessionId,
          role: "assistant",
          content,
          domainId,
          provider,
          thinkingDurationMs: timings.thinkingDurationMs,
          streamingDurationMs: timings.streamingDurationMs,
          totalDurationMs: timings.totalDurationMs,
          tokensUsed: null, // TODO: Extract from AI response if available
          errorType,
          metadata,
        } as LogMessageRequest),
      });
    } catch (error) {
      console.error("Failed to log assistant message:", error);
    } finally {
      // Reset timing data for next message
      this.resetTimings();
    }
  }

  /**
   * Update session metadata
   */
  async updateSession(updates: UpdateSessionRequest): Promise<void> {
    if (!this.sessionId) return;

    try {
      await fetch(`${API_BASE}/sessions/${this.sessionId}`, {
        method: "PATCH",
        headers: await authHeaders(this.getToken),
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error("Failed to update session:", error);
    }
  }

  /**
   * End the current session
   */
  async endSession(isComplete: boolean): Promise<void> {
    if (!this.sessionId) return;

    try {
      await this.updateSession({
        isComplete,
        endedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to end session:", error);
    } finally {
      this.sessionId = null;
      this.resetTimings();
    }
  }

  /**
   * Reset timing data for next message
   */
  private resetTimings() {
    this.timingData = {
      thinkingStartedAt: null,
      streamingStartedAt: null,
      requestStartedAt: null,
    };
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.sessionId !== null;
  }
}
