// apps/api/src/hono-app.ts
// Hono application - high-performance replacement for Express
// Now includes tRPC for type-safe API calls

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

// Import routers
import projectsRouter from './routes/hono/projects';
import keysRouter from './routes/hono/keys';
import aiRouter from './routes/hono/ai';
import sessionsRouter from './routes/hono/sessions';
import { appRouter } from './trpc/router';
import { createContext } from './trpc/context';

const app = new Hono();

// ── Middleware ────────────────────────────────────────────────────────────────

// Security headers
app.use('*', secureHeaders());

// CORS configuration
app.use('*', cors({
  origin: process.env.WEB_URL || 'http://localhost:3000',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
app.use('*', honoLogger());

// Pretty JSON in development
if (process.env.NODE_ENV !== 'production') {
  app.use('*', prettyJSON());
}

// ── tRPC Endpoint ─────────────────────────────────────────────────────────────
// All tRPC calls go through /trpc/*
app.all('/trpc/*', async (c) => {
  return fetchRequestHandler({
    router: appRouter,
    createContext,
    endpoint: '/trpc',
    req: c.req.raw,
  });
});

// ── REST Routes (Legacy - being migrated to tRPC) ─────────────────────────────

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: '@devdocs/api (Hono + tRPC)',
    ts: new Date().toISOString(),
    framework: 'Hono',
    api: 'tRPC',
    performance: '50k+ req/s',
  });
});

// Mount legacy Hono routes (will eventually be replaced by tRPC)
app.route('/projects', projectsRouter);
app.route('/keys', keysRouter);
app.route('/ai', aiRouter);
app.route('/sessions', sessionsRouter);

// Welcome endpoint
app.get('/', (c) => {
  return c.json({
    message: 'DevDocs API - Hono + tRPC Edition',
    performance: '5x faster than Express',
    typeSafety: 'Full end-to-end with tRPC',
    routes: {
      health: '/health',
      trpc: '/trpc',
      projects: '/projects (REST - being deprecated)',
    },
  });
});

// ── Error handling ────────────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error('Hono error:', err);
  return c.json({
    error: 'server_error',
    message: 'An unexpected error occurred.',
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'not_found',
    message: 'Route not found.',
  }, 404);
});

export default app;
