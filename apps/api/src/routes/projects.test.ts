// apps/api/src/routes/projects.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../hono-app';
import { getAuthHeaders, createTestUser } from '../test/helpers';
import { db, projects } from '../lib/db';
import { eq } from 'drizzle-orm';

// Thin helpers over Hono's app.request() to keep the assertions readable.
// Bodies are typed as `any` to match the previous supertest ergonomics.
async function post(path: string, headers: Record<string, string>, body: unknown): Promise<{ status: number; body: any }> {
  const res = await app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function get(path: string, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  const res = await app.request(path, { headers });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function del(path: string, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  const res = await app.request(path, { method: 'DELETE', headers });
  return { status: res.status, body: await res.json().catch(() => null) };
}

describe('POST /projects', () => {
  let authHeaders: Record<string, string>;
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser(`test-${Date.now()}@example.com`);
    userId = user.id;
    authHeaders = await getAuthHeaders(user.id);
  });

  it('creates a new project', async () => {
    const response = await post('/projects', authHeaders, {
      name: 'Test Project',
      type: 'saas',
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Test Project');
    expect(response.body.type).toBe('saas');
    expect(response.body.status).toBe('in_progress');
  });

  it('validates required fields', async () => {
    const response = await post('/projects', authHeaders, {
      name: '', // Invalid: empty name
      type: 'saas',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation_error');
  });

  it('requires authentication', async () => {
    const response = await post('/projects', {}, {
      name: 'Test Project',
      type: 'saas',
    });

    expect(response.status).toBe(401);
  });
});

describe('GET /projects', () => {
  let authHeaders: Record<string, string>;
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser(`test-${Date.now()}@example.com`);
    userId = user.id;
    authHeaders = await getAuthHeaders(user.id);
  });

  it('returns user projects only', async () => {
    // Create a project for this user
    await post('/projects', authHeaders, { name: 'User 1 Project', type: 'saas' });

    // Create another user and their project
    const user2 = await createTestUser(`test2-${Date.now()}@example.com`);
    const headers2 = await getAuthHeaders(user2.id);
    await post('/projects', headers2, { name: 'User 2 Project', type: 'api' });

    // User 1 should only see their project
    const response = await get('/projects', authHeaders);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].name).toBe('User 1 Project');
  });

  it('requires authentication', async () => {
    const response = await get('/projects');
    expect(response.status).toBe(401);
  });
});

describe('GET /projects/:id', () => {
  let authHeaders: Record<string, string>;
  let userId: string;
  let projectId: string;

  beforeEach(async () => {
    const user = await createTestUser(`test-${Date.now()}@example.com`);
    userId = user.id;
    authHeaders = await getAuthHeaders(user.id);

    // Create a test project
    const createResponse = await post('/projects', authHeaders, {
      name: 'Test Project',
      type: 'saas',
    });

    projectId = createResponse.body.id;
  });

  it('returns a single project', async () => {
    const response = await get(`/projects/${projectId}`, authHeaders);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(projectId);
    expect(response.body.name).toBe('Test Project');
  });

  it('returns 404 for non-existent project', async () => {
    const response = await get('/projects/00000000-0000-0000-0000-000000000000', authHeaders);

    expect(response.status).toBe(404);
  });

  it('prevents access to other users projects', async () => {
    const user2 = await createTestUser(`test2-${Date.now()}@example.com`);
    const headers2 = await getAuthHeaders(user2.id);

    const response = await get(`/projects/${projectId}`, headers2);

    expect(response.status).toBe(404);
  });
});

describe('DELETE /projects/:id', () => {
  let authHeaders: Record<string, string>;
  let userId: string;
  let projectId: string;

  beforeEach(async () => {
    const user = await createTestUser(`test-${Date.now()}@example.com`);
    userId = user.id;
    authHeaders = await getAuthHeaders(user.id);

    const createResponse = await post('/projects', authHeaders, {
      name: 'Test Project',
      type: 'saas',
    });

    projectId = createResponse.body.id;
  });

  it('soft deletes a project', async () => {
    const response = await del(`/projects/${projectId}`, authHeaders);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Verify project is soft deleted
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    expect(project?.deletedAt).not.toBeNull();
  });

  it('returns 404 for non-existent project', async () => {
    const response = await del('/projects/00000000-0000-0000-0000-000000000000', authHeaders);

    expect(response.status).toBe(404);
  });
});
