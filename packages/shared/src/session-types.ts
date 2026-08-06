// packages/shared/src/session-types.ts
// Types for interview session logging

import type { AIProvider, DomainId } from "./types";

export interface InterviewSession {
  id:                   string;
  projectId:            string;
  userId:               string;
  startedAt:            string;
  endedAt:              string | null;
  totalMessages:        number;
  totalDomainsCompleted: number;
  primaryProvider:      AIProvider | null;
  isComplete:           boolean;
  metadata:             SessionMetadata | null;
}

export interface SessionMetadata {
  projectType:    string;
  activeDomains:  DomainId[];
  teamSize:       string;
  timeline:       string;
  budget:         string;
  experienceLevel: string;
}

export interface InterviewMessage {
  id:                  string;
  sessionId:           string;
  role:                "user" | "assistant";
  content:             string;
  domainId:            DomainId;
  provider:            AIProvider | null;
  timestamp:           string;
  thinkingDurationMs:  number | null;
  streamingDurationMs: number | null;
  totalDurationMs:     number | null;
  tokensUsed:          number | null;
  errorType:           string | null;
  metadata:            MessageMetadata | null;
}

export interface MessageMetadata {
  // User message metadata - Card selections made in this message
  cardChoices?: Record<string, string>;

  // User message metadata - Schema actions performed
  schemaAction?: {
    type: "add_field" | "confirm_schema";
    table?: string;
    field?: string;
    fieldType?: string;
  };

  // Assistant message metadata - Message type classification
  messageType?: "completion" | "opener" | "card_picker" | "schema_builder" | "follow-up";

  // Assistant message metadata - Flags
  isOpener?: boolean;
  showsCardPicker?: boolean;
  showsSchemaBuilder?: boolean;

  // Domain transitions
  domainTransition?: {
    from: DomainId;
    to: DomainId;
  };

  // Generation metadata
  wasRegenerated?: boolean;
  regenerationCount?: number;

  // Error details
  errorDetails?: {
    message: string;
    stack?: string;
  };
}

export interface SessionTimingData {
  thinkingStartedAt: number | null;
  streamingStartedAt: number | null;
  requestStartedAt: number | null;
}

export interface CreateSessionRequest {
  projectId: string;
  metadata: SessionMetadata;
}

export interface LogMessageRequest {
  sessionId:           string;
  role:                "user" | "assistant";
  content:             string;
  domainId:            DomainId;
  provider:            AIProvider | null;
  thinkingDurationMs:  number | null;
  streamingDurationMs: number | null;
  totalDurationMs:     number | null;
  tokensUsed:          number | null;
  errorType:           string | null;
  metadata:            MessageMetadata | null;
}

export interface UpdateSessionRequest {
  totalMessages?:        number;
  totalDomainsCompleted?: number;
  primaryProvider?:      AIProvider;
  isComplete?:           boolean;
  endedAt?:              string;
}
