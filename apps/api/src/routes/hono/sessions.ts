// apps/api/src/routes/hono/sessions.ts
// Interview session logging endpoints
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db, interviewSessions, interviewMessages, projects } from '../../lib/db';
import { requireClerkAuth } from '../../middleware/hono-clerk-auth';

const app = new Hono();
app.use('*', requireClerkAuth);

// Zod schemas for validation
const CreateSessionSchema = z.object({
  projectId: z.string().uuid(),
  metadata: z.object({
    projectType: z.string(),
    activeDomains: z.array(z.string()),
    teamSize: z.string(),
    timeline: z.string(),
    budget: z.string(),
    experienceLevel: z.string(),
  }),
});

const LogMessageSchema = z.object({
  sessionId: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  domainId: z.string(),
  provider: z.string().nullable(),
  thinkingDurationMs: z.number().nullable(),
  streamingDurationMs: z.number().nullable(),
  totalDurationMs: z.number().nullable(),
  tokensUsed: z.number().nullable(),
  errorType: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
});

const UpdateSessionSchema = z.object({
  totalMessages: z.number().optional(),
  totalDomainsCompleted: z.number().optional(),
  primaryProvider: z.string().optional(),
  isComplete: z.boolean().optional(),
  endedAt: z.string().optional(),
});

// Create a new interview session
app.post('/', zValidator('json', CreateSessionSchema), async (c) => {
  const userId = c.get('userId');
  const { projectId, metadata } = c.req.valid('json');

  // Verify project ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  });

  if (!project) {
    return c.json({ error: 'not_found', message: 'Project not found.' }, 404);
  }

  const [session] = await db.insert(interviewSessions).values({
    projectId,
    userId,
    metadata,
    totalMessages: '0',
    totalDomainsCompleted: '0',
    isComplete: 'false',
  }).returning();

  return c.json(session, 201);
});

// Log a message to a session
app.post('/messages', zValidator('json', LogMessageSchema), async (c) => {
  const userId = c.get('userId');
  const data = c.req.valid('json');

  // Verify session ownership
  const session = await db.query.interviewSessions.findFirst({
    where: and(
      eq(interviewSessions.id, data.sessionId),
      eq(interviewSessions.userId, userId)
    ),
  });

  if (!session) {
    return c.json({ error: 'not_found', message: 'Session not found.' }, 404);
  }

  const [message] = await db.insert(interviewMessages).values({
    sessionId: data.sessionId,
    role: data.role,
    content: data.content,
    domainId: data.domainId,
    provider: data.provider,
    thinkingDurationMs: data.thinkingDurationMs?.toString() ?? null,
    streamingDurationMs: data.streamingDurationMs?.toString() ?? null,
    totalDurationMs: data.totalDurationMs?.toString() ?? null,
    tokensUsed: data.tokensUsed?.toString() ?? null,
    errorType: data.errorType,
    metadata: data.metadata,
  }).returning();

  return c.json(message, 201);
});

// Update session metadata
app.patch('/:sessionId', zValidator('json', UpdateSessionSchema), async (c) => {
  const userId = c.get('userId');
  const sessionId = c.req.param('sessionId');
  const updates = c.req.valid('json');

  // Verify session ownership
  const session = await db.query.interviewSessions.findFirst({
    where: and(
      eq(interviewSessions.id, sessionId),
      eq(interviewSessions.userId, userId)
    ),
  });

  if (!session) {
    return c.json({ error: 'not_found', message: 'Session not found.' }, 404);
  }

  const updateData: Record<string, unknown> = {};
  if (updates.totalMessages !== undefined) updateData.totalMessages = updates.totalMessages.toString();
  if (updates.totalDomainsCompleted !== undefined) updateData.totalDomainsCompleted = updates.totalDomainsCompleted.toString();
  if (updates.primaryProvider !== undefined) updateData.primaryProvider = updates.primaryProvider;
  if (updates.isComplete !== undefined) updateData.isComplete = updates.isComplete.toString();
  if (updates.endedAt !== undefined) updateData.endedAt = new Date(updates.endedAt);

  const [updated] = await db
    .update(interviewSessions)
    .set(updateData)
    .where(eq(interviewSessions.id, sessionId))
    .returning();

  return c.json(updated);
});

// Get session details with all messages
app.get('/:sessionId', async (c) => {
  const userId = c.get('userId');
  const sessionId = c.req.param('sessionId');

  const session = await db.query.interviewSessions.findFirst({
    where: and(
      eq(interviewSessions.id, sessionId),
      eq(interviewSessions.userId, userId)
    ),
  });

  if (!session) {
    return c.json({ error: 'not_found', message: 'Session not found.' }, 404);
  }

  const messages = await db.query.interviewMessages.findMany({
    where: eq(interviewMessages.sessionId, sessionId),
  });

  return c.json({ session, messages });
});

// Get all sessions for a project
app.get('/project/:projectId', async (c) => {
  const userId = c.get('userId');
  const projectId = c.req.param('projectId');

  // Verify project ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  });

  if (!project) {
    return c.json({ error: 'not_found', message: 'Project not found.' }, 404);
  }

  const sessions = await db.query.interviewSessions.findMany({
    where: eq(interviewSessions.projectId, projectId),
  });

  return c.json(sessions);
});

export default app;
