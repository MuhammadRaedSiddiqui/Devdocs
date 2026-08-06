# Interview Session Logging System

## Overview

The session logging system provides **comprehensive tracking of all interview interactions**, including user messages, AI responses, exact timestamps, thinking/streaming durations, domain progression, and detailed metadata. This enables analytics, debugging, and audit trails for the entire interview lifecycle.

---

## Architecture

### High-Level Flow

```
User starts interview
         ↓
SessionLogger.startSession() → POST /sessions (creates session record)
         ↓
User sends message → SessionLogger.logUserMessage() → POST /sessions/messages
         ↓
AI thinking starts → SessionLogger.startThinking() (tracks timing)
         ↓
AI streaming starts → SessionLogger.startStreaming() (tracks timing)
         ↓
AI response complete → SessionLogger.logAssistantMessage() → POST /sessions/messages
         ↓
Domain completed → SessionLogger.updateSession() → PATCH /sessions/{id}
         ↓
Interview complete → SessionLogger.endSession() → PATCH /sessions/{id}
```

---

## Database Schema

### Tables

#### `interview_sessions`
Tracks high-level session data for each interview.

```sql
CREATE TABLE interview_sessions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at             TIMESTAMPTZ DEFAULT NOW(),
  ended_at               TIMESTAMPTZ,
  total_messages         TEXT DEFAULT '0',
  total_domains_completed TEXT DEFAULT '0',
  primary_provider       TEXT,  -- Most used AI provider in session
  is_complete            TEXT DEFAULT 'false',
  metadata               JSONB  -- Project context, active domains, etc.
);
```

**Metadata structure:**
```typescript
{
  projectType: "saas",
  activeDomains: ["planning", "architecture", "database", ...],
  teamSize: "solo",
  timeline: "1_3_months",
  budget: "bootstrapped",
  experienceLevel: "intermediate"
}
```

#### `interview_messages`
Logs every individual message with detailed timing and metadata.

```sql
CREATE TABLE interview_messages (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  role                 TEXT NOT NULL,  -- "user" | "assistant"
  content              TEXT NOT NULL,
  domain_id            TEXT NOT NULL,
  provider             TEXT,  -- AI provider used (NULL for user messages)
  timestamp            TIMESTAMPTZ DEFAULT NOW(),
  thinking_duration_ms TEXT,  -- Time in "thinking" state
  streaming_duration_ms TEXT, -- Time spent streaming
  total_duration_ms    TEXT,  -- Total time from request to completion
  tokens_used          TEXT,  -- Tokens from provider (if available)
  error_type           TEXT,  -- Error type if failed
  metadata             JSONB  -- Card choices, schema actions, etc.
);
```

**Metadata structure:**
```typescript
{
  // Card selections made in this message
  cardChoices?: { [key: string]: string },

  // Schema actions performed
  schemaAction?: {
    type: "add_field" | "confirm_schema",
    table?: string,
    field?: string,
    fieldType?: string
  },

  // Domain transitions
  domainTransition?: {
    from: DomainId,
    to: DomainId
  },

  // Generation metadata
  wasRegenerated?: boolean,
  regenerationCount?: number,

  // Error details
  errorDetails?: {
    message: string,
    stack?: string
  }
}
```

---

## API Endpoints

### Base URL
- Dev: `http://localhost:4000/sessions`
- Prod: `https://api.devdocs.ai/sessions`

### Authentication
All endpoints require a valid Clerk token in the `Authorization: Bearer` header.

---

### `POST /sessions`
Create a new interview session.

**Request:**
```typescript
{
  projectId: string;  // UUID
  metadata: {
    projectType: string;
    activeDomains: string[];
    teamSize: string;
    timeline: string;
    budget: string;
    experienceLevel: string;
  };
}
```

**Response (201):**
```typescript
{
  id: string;
  projectId: string;
  userId: string;
  startedAt: string;
  endedAt: null;
  totalMessages: "0";
  totalDomainsCompleted: "0";
  primaryProvider: null;
  isComplete: "false";
  metadata: { ... };
}
```

---

### `POST /sessions/messages`
Log a single message (user or assistant) with timing data.

**Request:**
```typescript
{
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  domainId: string;
  provider: string | null;
  thinkingDurationMs: number | null;
  streamingDurationMs: number | null;
  totalDurationMs: number | null;
  tokensUsed: number | null;
  errorType: string | null;
  metadata: object | null;
}
```

**Response (201):**
```typescript
{
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  domainId: string;
  provider: string | null;
  timestamp: string;
  thinkingDurationMs: string | null;
  streamingDurationMs: string | null;
  totalDurationMs: string | null;
  tokensUsed: string | null;
  errorType: string | null;
  metadata: object | null;
}
```

---

### `PATCH /sessions/:sessionId`
Update session metadata (messages count, domains completed, completion status).

**Request:**
```typescript
{
  totalMessages?: number;
  totalDomainsCompleted?: number;
  primaryProvider?: string;
  isComplete?: boolean;
  endedAt?: string;  // ISO 8601 timestamp
}
```

**Response (200):**
Updated session object.

---

### `GET /sessions/:sessionId`
Retrieve full session details with all messages.

**Response (200):**
```typescript
{
  session: InterviewSession;
  messages: InterviewMessage[];
}
```

---

### `GET /sessions/project/:projectId`
Get all sessions for a specific project.

**Response (200):**
```typescript
InterviewSession[]
```

---

## Frontend Integration

### SessionLogger Class

Located at: `apps/web/lib/session/logger.ts`

**Key Methods:**

```typescript
class SessionLogger {
  // Start a new interview session
  async startSession(request: CreateSessionRequest): Promise<string | null>

  // Mark the start of thinking phase (before AI streaming)
  startThinking(): void

  // Mark the start of streaming phase
  startStreaming(): void

  // Log a user message
  async logUserMessage(
    content: string,
    domainId: DomainId,
    metadata?: MessageMetadata | null
  ): Promise<void>

  // Log an assistant message with timing data
  async logAssistantMessage(
    content: string,
    domainId: DomainId,
    provider: AIProvider,
    errorType?: string | null,
    metadata?: MessageMetadata | null
  ): Promise<void>

  // Update session metadata
  async updateSession(updates: UpdateSessionRequest): Promise<void>

  // End the current session
  async endSession(isComplete: boolean): Promise<void>

  // Check if session is active
  isActive(): boolean

  // Get current session ID
  getSessionId(): string | null
}
```

---

### Interview Store Integration

The `SessionLogger` is integrated into the Zustand interview store (`apps/web/lib/interview/store.ts`) and automatically tracks:

1. **Session Initialization** - When interview starts
2. **User Messages** - Every message sent by user
3. **AI Responses** - Every AI response with timing data
4. **Card Selections** - Domain card choices with metadata
5. **Schema Actions** - Field additions and schema confirmation
6. **Domain Completion** - When each domain is completed
7. **Interview Completion** - When full interview ends

**Timing Tracking:**
```typescript
// When user sends message:
sessionLogger.startThinking()           // Mark thinking start
  ↓
// 400ms UI delay
  ↓
sessionLogger.startStreaming()          // Mark streaming start
  ↓
// AI streams response
  ↓
sessionLogger.logAssistantMessage(...)  // Log with calculated durations:
  // - thinkingDurationMs: streamingStart - thinkingStart
  // - streamingDurationMs: now - streamingStart
  // - totalDurationMs: now - thinkingStart
```

---

## Usage Example

### Complete Interview Flow

```typescript
// 1. Initialize session when interview starts
const logger = new SessionLogger(getToken);
await logger.startSession({
  projectId: "123e4567-e89b-12d3-a456-426614174000",
  metadata: {
    projectType: "saas",
    activeDomains: ["planning", "architecture", "database"],
    teamSize: "solo",
    timeline: "1_3_months",
    budget: "bootstrapped",
    experienceLevel: "intermediate",
  },
});

// 2. User sends a message
await logger.logUserMessage(
  "I want to build a task management SaaS",
  "planning"
);

// 3. AI responds (timing tracked automatically)
logger.startThinking();
// ... UI delay
logger.startStreaming();
// ... AI streams response
await logger.logAssistantMessage(
  "Great! Let's plan your task management SaaS...",
  "planning",
  "anthropic",
  null,
  null
);

// 4. User selects a card
await logger.logUserMessage(
  "Selected: Monolithic (Rails-style)",
  "architecture",
  {
    cardChoices: { architecture: "monolithic" }
  }
);

// 5. Domain completes
await logger.updateSession({
  totalDomainsCompleted: 1,
  totalMessages: 4,
  primaryProvider: "anthropic",
});

// 6. Interview completes
await logger.endSession(true);
```

---

## Analytics & Insights

### Queries You Can Run

**Average thinking time per provider:**
```sql
SELECT 
  provider,
  AVG(CAST(thinking_duration_ms AS INTEGER)) as avg_thinking_ms,
  AVG(CAST(streaming_duration_ms AS INTEGER)) as avg_streaming_ms
FROM interview_messages
WHERE provider IS NOT NULL
GROUP BY provider;
```

**Most common domain progression:**
```sql
SELECT 
  domain_id,
  COUNT(*) as message_count,
  AVG(CAST(total_duration_ms AS INTEGER)) as avg_duration
FROM interview_messages
WHERE role = 'assistant'
GROUP BY domain_id
ORDER BY message_count DESC;
```

**Session completion rate:**
```sql
SELECT 
  COUNT(CASE WHEN is_complete = 'true' THEN 1 END)::float / COUNT(*) * 100 as completion_rate
FROM interview_sessions;
```

**Average messages per domain:**
```sql
SELECT 
  AVG(CAST(total_messages AS INTEGER)) as avg_messages,
  AVG(CAST(total_domains_completed AS INTEGER)) as avg_domains
FROM interview_sessions
WHERE is_complete = 'true';
```

---

## Schema Migration

To apply the database schema changes:

```bash
cd apps/api
pnpm drizzle-kit push
```

This will create the `interview_sessions` and `interview_messages` tables in your PostgreSQL database.

**⚠️ Note:** Existing projects will not have session data retroactively. Session logging only applies to interviews started after this feature is deployed.

---

## File Changes Summary

### New Files
1. `packages/shared/src/session-types.ts` - TypeScript types for sessions
2. `apps/api/src/routes/hono/sessions.ts` - API endpoints
3. `apps/web/lib/session/logger.ts` - Frontend session logger

### Modified Files
1. `apps/api/src/schema.ts` - Added session tables
2. `apps/api/src/hono-app.ts` - Registered sessions router
3. `apps/web/lib/interview/store.ts` - Integrated session logging
4. `apps/web/app/(app)/project/[id]/interview/page.tsx` - Initialize sessions
5. `packages/shared/src/index.ts` - Export session types

---

## Testing

### Manual Testing Flow

1. **Start a new project interview**
2. **Check database:** Session record created in `interview_sessions`
3. **Send a user message**
4. **Check database:** User message logged in `interview_messages`
5. **Wait for AI response**
6. **Check database:** 
   - Assistant message logged with timing data
   - `thinking_duration_ms`, `streaming_duration_ms`, `total_duration_ms` populated
7. **Complete a domain** 
8. **Check database:** Session `total_domains_completed` incremented
9. **Complete interview**
10. **Check database:** Session marked `is_complete = 'true'`, `ended_at` set

### API Testing with cURL

```bash
# Get session details
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/sessions/YOUR_SESSION_ID

# Get all sessions for a project
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/sessions/project/YOUR_PROJECT_ID
```

---

## Performance Considerations

1. **Non-blocking:** All session logging is fire-and-forget. Failures don't interrupt the interview.
2. **Minimal overhead:** Each log call is a single HTTP POST with < 1KB payload.
3. **No UI delays:** Logging happens asynchronously in the background.
4. **Database indexes:** Add indexes on `session_id`, `project_id`, and `timestamp` for fast queries.

**Recommended indexes:**
```sql
CREATE INDEX idx_messages_session ON interview_messages(session_id);
CREATE INDEX idx_messages_timestamp ON interview_messages(timestamp);
CREATE INDEX idx_sessions_project ON interview_sessions(project_id);
CREATE INDEX idx_sessions_user ON interview_sessions(user_id);
```

---

## Privacy & Data Retention

- **Session data contains full message content** — treat as sensitive user data
- **Stored indefinitely by default** — consider implementing data retention policies
- **GDPR compliance:** Users should be able to export/delete their session data
- **Consider adding:** Session export endpoint, bulk deletion endpoint

---

## Future Enhancements

1. **Token usage tracking** - Extract from AI provider responses
2. **Session replay** - Reconstruct interview state from session logs
3. **Real-time analytics** - Stream session events to analytics service
4. **Session comparison** - Compare timing/quality across providers
5. **Anomaly detection** - Alert on unusual session patterns (very long thinking, high error rates)
6. **Export to CSV/JSON** - Download session data for offline analysis

---

## Summary

The session logging system is now **fully integrated** into DevDocs AI. Every interview interaction is tracked with:

- ✅ Exact timestamps
- ✅ Thinking & streaming durations
- ✅ Domain progression
- ✅ Card selections & schema actions
- ✅ Error types & metadata
- ✅ Provider usage stats

This data enables powerful analytics, debugging capabilities, and audit trails for the entire interview lifecycle.
