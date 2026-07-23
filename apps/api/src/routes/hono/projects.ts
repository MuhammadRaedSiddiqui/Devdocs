// apps/api/src/routes/hono/projects.ts
// Projects route - Hono version (migrated from Express)
// Benefits: Better performance, type-safe routing, Zod validation built-in

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { db, projects } from '../../lib/db';
import { ProjectCreateSchema, ProjectUpdateSchema } from '@devdocs/shared';
import { logger } from '../../lib/logger';
import { requireClerkAuth } from '../../middleware/hono-clerk-auth';
import { z } from 'zod';

const app = new Hono();

// Apply auth middleware to all routes
app.use('*', requireClerkAuth);

// ── GET /projects — list all non-deleted projects ────────────────────────────
app.get('/', async (c) => {
  const userId = c.get('userId');

  try {
    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
      .orderBy(desc(projects.updatedAt));

    const result = rows.map(p => ({
      id:               p.id,
      name:             p.name,
      type:             p.type,
      status:           p.status,
      description:      p.description ?? '',
      domainsCompleted: countDomains(p.interviewData),
      updatedAt:        timeAgo(p.updatedAt),
    }));

    logger.info({ userId, count: result.length }, 'Listed projects (Hono)');
    return c.json(result);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to list projects (Hono)');
    return c.json({ error: 'server_error', message: 'Failed to load projects.' }, 500);
  }
});

// ── GET /projects/:id — single project with full data ────────────────────────
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  try {
    const row = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, id),
        eq(projects.userId, userId),
        isNull(projects.deletedAt)
      ),
    });

    if (!row) {
      logger.warn({ projectId: id, userId }, 'Project not found (Hono)');
      return c.json({ error: 'not_found', message: 'Project not found.' }, 404);
    }

    logger.info({ projectId: row.id, userId }, 'Retrieved project (Hono)');
    return c.json({
      id:               row.id,
      name:             row.name,
      type:             row.type,
      status:           row.status,
      description:      row.description ?? '',
      domainsCompleted: countDomains(row.interviewData),
      interviewData:    row.interviewData,
      updatedAt:        timeAgo(row.updatedAt),
    });
  } catch (err) {
    logger.error({ err, projectId: id, userId }, 'Failed to load project (Hono)');
    return c.json({ error: 'server_error', message: 'Failed to load project.' }, 500);
  }
});

// ── POST /projects — create new project ──────────────────────────────────────
app.post(
  '/',
  zValidator('json', ProjectCreateSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: 'validation_error', message: 'Invalid request.', fields: result.error.flatten().fieldErrors },
        400
      );
    }
  }),
  async (c) => {
    const { name, type } = c.req.valid('json'); // Fully typed!
    const userId = c.get('userId');

    try {
      const [row] = await db
        .insert(projects)
        .values({
          userId,
          name,
          type,
          status: 'in_progress',
        })
        .returning();

      logger.info({ userId, projectId: row.id, name, type }, 'Project created (Hono)');
      return c.json({
        id:               row.id,
        name:             row.name,
        type:             row.type,
        status:           row.status,
        description:      '',
        domainsCompleted: 0,
        updatedAt:        'Just now',
      }, 201);
    } catch (err) {
      logger.error({ err, userId, name }, 'Failed to create project (Hono)');
      return c.json({ error: 'server_error', message: 'Failed to create project.' }, 500);
    }
  }
);

// ── PATCH /projects/:id — update project ─────────────────────────────────────
app.patch(
  '/:id',
  zValidator('json', ProjectUpdateSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: 'validation_error', message: 'Invalid request.', fields: result.error.flatten().fieldErrors },
        400
      );
    }
  }),
  async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const updates = c.req.valid('json');

    try {
      // Verify ownership
      const existing = await db.query.projects.findFirst({
        where: and(eq(projects.id, id), eq(projects.userId, userId), isNull(projects.deletedAt)),
      });

      if (!existing) {
        logger.warn({ projectId: id, userId }, 'Project not found for update (Hono)');
        return c.json({ error: 'not_found', message: 'Project not found.' }, 404);
      }

      const [row] = await db
        .update(projects)
        .set({
          ...(updates.name          && { name:          updates.name }),
          ...(updates.status        && { status:        updates.status }),
          ...(updates.interviewData && { interviewData: updates.interviewData }),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();

      logger.info({ userId, projectId: id }, 'Project updated (Hono)');
      return c.json({
        id:               row.id,
        name:             row.name,
        type:             row.type,
        status:           row.status,
        description:      row.description ?? '',
        domainsCompleted: countDomains(row.interviewData),
        updatedAt:        'Just now',
      });
    } catch (err) {
      logger.error({ err, projectId: id, userId }, 'Failed to update project (Hono)');
      return c.json({ error: 'server_error', message: 'Failed to update project.' }, 500);
    }
  }
);

// ── DELETE /projects/:id — soft delete ───────────────────────────────────────
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  try {
    const existing = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, userId)),
    });

    if (!existing) {
      logger.warn({ projectId: id, userId }, 'Project not found for deletion (Hono)');
      return c.json({ error: 'not_found', message: 'Project not found.' }, 404);
    }

    await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(eq(projects.id, id));

    logger.info({ userId, projectId: id }, 'Project deleted (Hono)');
    return c.json({ success: true });
  } catch (err) {
    logger.error({ err, projectId: id, userId }, 'Failed to delete project (Hono)');
    return c.json({ error: 'server_error', message: 'Failed to delete project.' }, 500);
  }
});

export default app;

// ── Helpers ───────────────────────────────────────────────────────────────────
function countDomains(interviewData: unknown): number {
  if (!interviewData || typeof interviewData !== 'object') return 0;
  const data = interviewData as Record<string, unknown>;
  if (!Array.isArray(data.completedDomains)) return 0;
  return (data.completedDomains as unknown[]).length;
}

function timeAgo(date: Date | null | undefined): string {
  if (!date) return 'Unknown';
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}
