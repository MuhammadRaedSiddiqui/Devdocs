● Complete Implementation Guide: Tech Stack Improvements

  Project: DevDocs AI Monorepo
  Objective: Production-ready tech stack  Timeline: 6 weeks
  Team Size: 1-2 developers
  ---
  Table of Contents

  1. Pre-Implementation Checklist (#1-pre-implementation-checklist)
  2. Phase 1: Critical Monitoring & Testing (Week 1-2) (#phase-1-critical-monitoring--testing-week-1-2)
  3. Phase 2: Auth Replacement (Week 3) (#phase-2-auth-replacement-week-3)
  4. Phase 3: Express → Hono Migration (Week 4) (#phase-3-express--hono-migration-week-4)
  5. Phase 4: tRPC Implementation (Week 5) (#phase-4-trpc-implementation-week-5)
  6. Phase 5: Email & Analytics (Week 6) (#phase-5-email--analytics-week-6)
  7. Testing & Verification (#7-testing--verification)
  8. Rollback Procedures (#8-rollback-procedures)

  ---
  1. Pre-Implementation Checklist

  Before Starting

  - [ ] Create a new branch: git checkout -b tech-stack-upgrade
  - [ ] Backup current database: pg_dump devdocs > backup.sql
  - [ ] Document current environment variables
  - [ ] Set up staging environment
  - [ ] Notify team of upcoming changes
  - [ ] Block 6 weeks in calendar
  - [ ] Set up project tracking (GitHub Projects, Linear, etc.)

  Required Accounts

  - [ ] Sentry account (free tier)
  - [ ] Axiom account (free tier) or Logtail
  - [ ] Clerk account (if choosing Clerk for auth)
  - [ ] Resend account (free tier)
  - [ ] PostHog account (free tier)
  - [ ] Unkey account (optional, free tier)

  Development Setup

  # Ensure you're on the right versions
  node --version  # Should be 20+
  pnpm --version  # Should be 9+

  # Create .env.example with all new variables
  cd devdocs-monorepo/devdocs-monorepo

  ---
  Phase 1: Critical Monitoring & Testing (Week 1-2)

  Day 1-2: Error Monitoring (Sentry)

  Step 1.1: Install Dependencies

  cd apps/api
  pnpm add @sentry/node @sentry/profiling-node

  cd ../web
  pnpm add @sentry/nextjs

  Step 1.2: Initialize Sentry (API)

  Create apps/api/src/lib/sentry.ts:

  // apps/api/src/lib/sentry.ts
  import * as Sentry from "@sentry/node";
  import { nodeProfilingIntegration } from "@sentry/profiling-node";

  export function initSentry() {
    if (!process.env.SENTRY_DSN) {
      console.warn("SENTRY_DSN not set, skipping Sentry initialization");
      return;
    }

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",

      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Profiling (optional, but recommended)
      profilesSampleRate: 0.1,
      integrations: [nodeProfilingIntegration()],

      // Filter sensitive data
      beforeSend(event) {
        // Remove API keys from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            if (breadcrumb.data?.apiKey) {
              breadcrumb.data.apiKey = "[REDACTED]";
            }
            return breadcrumb;
          });
        }
        return event;
      },
    });
  }

  // Helper to capture errors with context
  export function captureError(error: Error, context?: Record<string, unknown>) {
    Sentry.captureException(error, {
      extra: context,
    });
  }

  // Helper for manual error logging
  export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
    Sentry.captureMessage(message, level);
  }

  Step 1.3: Update API Entry Point

  // apps/api/src/index.ts
  import { initSentry, captureError } from "./lib/sentry";
  import * as Sentry from "@sentry/node";

  // Initialize Sentry FIRST (before any other imports)
  initSentry();

  import express from "express";
  // ... rest of imports

  const app = express();

  // Sentry request handler MUST be first middleware
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  // ... your existing middleware (cors, helmet, etc.)

  // Your routes here
  app.use("/projects", requireAuth, projectsRouter);
  app.use("/ai", requireAuth, aiRouter);

  // Sentry error handler MUST be before other error handlers
  app.use(Sentry.Handlers.errorHandler());

  // Your custom error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[unhandled]", err);
    captureError(err, {
      userId: req.userId,
      path: req.path,
      method: req.method,
    });
    res.status(500).json({ error: "server_error", message: "An unexpected error occurred." });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 @devdocs/api running at http://localhost:${PORT}`);
  });

  Step 1.4: Initialize Sentry (Web)

  cd apps/web
  npx @sentry/wizard@latest -i nextjs

  This wizard will:
  - Create sentry.client.config.ts
  - Create sentry.server.config.ts
  - Create sentry.edge.config.ts
  - Update next.config.ts

  Manually configure:

  // apps/web/sentry.client.config.ts
  import * as Sentry from "@sentry/nextjs";

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,

    tracesSampleRate: 0.1,

    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    beforeSend(event) {
      // Filter out API keys from localStorage
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(b => {
          if (b.category === 'console' && b.message?.includes('apiKey')) {
            b.message = b.message.replace(/sk-[a-zA-Z0-9-]+/g, '[REDACTED]');
          }
          return b;
        });
      }
      return event;
    },
  });

  Step 1.5: Add Environment Variables

  # apps/api/.env
  SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

  # apps/web/.env.local
  NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

  Step 1.6: Test Sentry

  // apps/api/src/routes/health.ts (add test endpoint)
  router.get('/test-error', (req, res) => {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error('Test error for Sentry');
    }
    res.status(403).json({ error: 'Only available in development' });
  });

  Test:
  curl http://localhost:4000/health/test-error
  # Check Sentry dashboard for error

  ---
  Day 3-4: Structured Logging

  Step 2.1: Install Pino

  cd apps/api
  pnpm add pino pino-pretty pino-http

  Step 2.2: Create Logger

  // apps/api/src/lib/logger.ts
  import pino from 'pino';

  const isProduction = process.env.NODE_ENV === 'production';

  export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',

    // Pretty print in development
    transport: !isProduction ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,

    // Production: JSON format for log aggregators
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },

    // Base fields included in every log
    base: {
      service: '@devdocs/api',
      environment: process.env.NODE_ENV,
    },

    // Redact sensitive fields
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.apiKey', '*.password'],
      remove: true,
    },
  });

  // Child logger with specific context
  export function createLogger(context: Record<string, unknown>) {
    return logger.child(context);
  }

  Step 2.3: Add HTTP Request Logging

  // apps/api/src/index.ts
  import pinoHttp from 'pino-http';
  import { logger } from './lib/logger';

  // Add AFTER Sentry middleware, BEFORE your routes
  app.use(pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health', // Don't log health checks
    },
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        userId: req.raw.userId, // Add user context
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  }));

  Step 2.4: Replace console.log Throughout Codebase

  Before:
  console.log("Project created:", projectId);
  console.error("Failed to encrypt key:", err);

  After:
  import { logger } from '@/lib/logger';

  logger.info({ projectId, userId }, 'Project created');
  logger.error({ err, userId }, 'Failed to encrypt key');

  Step 2.5: Update All Route Files

  Example for apps/api/src/routes/projects.ts:

  // apps/api/src/routes/projects.ts
  import { logger } from '../lib/logger';

  // Before
  router.post("/", validateBody(ProjectCreateSchema), async (req, res) => {
    const { name, type } = req.body;
    const userId = req.userId!;

    console.log("Creating project:", name); // ❌ OLD

    const project = await db.insert(projects).values({ userId, name, type });
    res.json(project);
  });

  // After
  router.post("/", validateBody(ProjectCreateSchema), async (req, res) => {
    const { name, type } = req.body;
    const userId = req.userId!;

    logger.info({ userId, name, type }, 'Creating project'); // ✅ NEW

    try {
      const project = await db.insert(projects).values({ userId, name, type });
      logger.info({ userId, projectId: project.id }, 'Project created successfully');
      res.json(project);
    } catch (err) {
      logger.error({ err, userId, name }, 'Failed to create project');
      throw err; // Sentry will capture this
    }
  });

  Step 2.6: Set Up Log Aggregation (Axiom)

  # Sign up at axiom.co
  # Create dataset: "devdocs-api"
  # Get API token

  Add to production deployment:

  # Railway/Fly.io environment
  AXIOM_DATASET=devdocs-api
  AXIOM_TOKEN=xaat-xxx

  Install Axiom transport (optional, for production):

  pnpm add @axiomhq/pino

  // apps/api/src/lib/logger.ts (production only)
  import { createWriteStream } from '@axiomhq/pino';

  const stream = process.env.AXIOM_TOKEN
    ? createWriteStream({
        dataset: process.env.AXIOM_DATASET!,
        token: process.env.AXIOM_TOKEN!,
      })
    : undefined;

  export const logger = pino(
    { /* config */ },
    stream // Send to Axiom in production
  );

  ---
  Day 5-10: Testing Infrastructure

  Step 3.1: Install Vitest

  cd apps/api
  pnpm add -D vitest @vitest/ui supertest @types/supertest

  Step 3.2: Create Vitest Config

  // apps/api/vitest.config.ts
  import { defineConfig } from 'vitest/config';
  import path from 'path';

  export default defineConfig({
    test: {
      globals: true,
      environment: 'node',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'dist/', 'src/test/'],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  });

  Step 3.3: Create Test Setup

  // apps/api/src/test/setup.ts
  import { beforeAll, afterAll, afterEach } from 'vitest';
  import { db } from '../lib/db';

  // Set test environment
  process.env.NODE_ENV = 'test';

  // Use test database
  process.env.DATABASE_URL = process.env.DATABASE_URL?.replace('/devdocs', '/devdocs_test');

  beforeAll(async () => {
    // Run migrations on test DB
    // await migrate(db, { migrationsFolder: './drizzle' });
  });

  afterEach(async () => {
    // Clean up after each test
    // await db.delete(projects);
    // await db.delete(users);
  });

  afterAll(async () => {
    // Close connections
    // await db.end();
  });

  Step 3.4: Create Test Helpers

  // apps/api/src/test/helpers.ts
  import { db, users, sessions } from '../lib/db';
  import type { User } from '../schema';

  export async function createTestUser(email = 'test@example.com'): Promise<User> {
    const [user] = await db.insert(users).values({
      email,
      displayName: 'Test User',
    }).returning();
    return user;
  }

  export async function createTestSession(userId: string): Promise<string> {
    const token = `test-token-${Date.now()}`;
    await db.insert(sessions).values({
      id: `session-${Date.now()}`,
      userId,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    return token;
  }

  export async function getAuthHeaders(userId?: string) {
    const user = userId ? { id: userId } : await createTestUser();
    const token = await createTestSession(user.id);
    return { Cookie: `devdocs_session=${token}` };
  }

  Step 3.5: Write First Test

  // apps/api/src/routes/projects.test.ts
  import { describe, it, expect, beforeEach } from 'vitest';
  import request from 'supertest';
  import app from '../index';
  import { getAuthHeaders, createTestUser } from '../test/helpers';

  describe('POST /projects', () => {
    let authHeaders: Record<string, string>;

    beforeEach(async () => {
      const user = await createTestUser();
      authHeaders = await getAuthHeaders(user.id);
    });

    it('creates a new project', async () => {
      const response = await request(app)
        .post('/projects')
        .set(authHeaders)
        .send({
          name: 'Test Project',
          type: 'saas',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Project');
    });

    it('validates required fields', async () => {
      const response = await request(app)
        .post('/projects')
        .set(authHeaders)
        .send({
          name: '', // Invalid: empty name
          type: 'saas',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('validation_error');
    });

    it('requires authentication', async () => {
      const response = await request(app)
        .post('/projects')
        .send({
          name: 'Test Project',
          type: 'saas',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /projects', () => {
    it('returns user projects only', async () => {
      const user1 = await createTestUser('user1@example.com');
      const user2 = await createTestUser('user2@example.com');

      const headers1 = await getAuthHeaders(user1.id);
      const headers2 = await getAuthHeaders(user2.id);

      // Create project for user1
      await request(app)
        .post('/projects')
        .set(headers1)
        .send({ name: 'User 1 Project', type: 'saas' });

      // Create project for user2
      await request(app)
        .post('/projects')
        .set(headers2)
        .send({ name: 'User 2 Project', type: 'api' });

      // User1 should only see their project
      const response1 = await request(app)
        .get('/projects')
        .set(headers1);

      expect(response1.body).toHaveLength(1);
      expect(response1.body[0].name).toBe('User 1 Project');
    });
  });

  Step 3.6: Add Test Scripts

  // apps/api/package.json
  {
    "scripts": {
      "test": "vitest",
      "test:ui": "vitest --ui",
      "test:coverage": "vitest run --coverage",
      "test:watch": "vitest watch"
    }
  }

  Step 3.7: Run Tests

  cd apps/api

  # Create test database
  createdb devdocs_test

  # Run tests
  pnpm test

  # Open UI
  pnpm test:ui

  Step 3.8: Write Tests for All Routes

  Continue writing tests for:
  - [ ] routes/ai.test.ts (AI streaming, caching)
  - [ ] routes/keys.test.ts (key encryption, masking)
  - [ ] middleware/auth.test.ts (session validation)
  - [ ] middleware/rateLimit.test.ts (rate limiting logic)
  - [ ] lib/crypto.test.ts (encryption/decryption)

  Step 3.9: Frontend Testing (Playwright)

  cd apps/web
  pnpm create playwright

  Answer prompts:
  - TypeScript: Yes
  - Tests folder: tests/e2e
  - GitHub Actions: Yes

  Create first E2E test:

  // apps/web/tests/e2e/interview.spec.ts
  import { test, expect } from '@playwright/test';

  test.describe('Interview Flow', () => {
    test('completes full interview', async ({ page }) => {
      await page.goto('/dashboard');

      // Create new project
      await page.click('text=New Project');
      await page.fill('[name="name"]', 'Test SaaS Project');
      await page.selectOption('[name="type"]', 'saas');
      await page.click('text=Create');

      // Wait for interview page
      await page.waitForURL(/\/project\/.*\/interview/);

      // Fill discovery form
      await page.selectOption('[name="teamSize"]', 'solo');
      await page.selectOption('[name="timeline"]', '1_3_months');
      await page.selectOption('[name="budget"]', 'bootstrapped');
      await page.click('text=Start Interview');

      // First domain (planning)
      await page.fill('textarea', 'A SaaS tool for project management');
      await page.click('text=Send');

      // Wait for AI response
      await expect(page.locator('text=Planning')).toBeVisible({ timeout: 10000 });

      // Continue through domains...
    });
  });

  Run E2E tests:

  pnpm playwright test
  pnpm playwright test --ui  # Debug mode

  ---
  Day 11-12: CI/CD Integration

  Step 4.1: Update GitHub Actions

  # .github/workflows/ci.yml
  name: CI

  on:
    pull_request:
    push:
      branches: [main]

  jobs:
    lint-and-typecheck:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v2
          with:
            version: 9
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: 'pnpm'

        - run: pnpm install
        - run: pnpm typecheck
        - run: pnpm lint

    test-api:
      runs-on: ubuntu-latest
      services:
        postgres:
          image: postgres:15
          env:
            POSTGRES_PASSWORD: postgres
            POSTGRES_DB: devdocs_test
          options: >-
            --health-cmd pg_isready
            --health-interval 10s
            --health-timeout 5s
            --health-retries 5
          ports:
            - 5432:5432

        redis:
          image: redis:7
          ports:
            - 6379:6379

      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v2
          with:
            version: 9
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: 'pnpm'

        - run: pnpm install
        - run: cd apps/api && pnpm test
          env:
            DATABASE_URL: postgresql://postgres:postgres@localhost:5432/devdocs_test
            REDIS_URL: redis://localhost:6379

    test-e2e:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v2
          with:
            version: 9
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: 'pnpm'

        - run: pnpm install
        - run: npx playwright install --with-deps
        - run: cd apps/web && pnpm playwright test

        - uses: actions/upload-artifact@v4
          if: always()
          with:
            name: playwright-report
            path: apps/web/playwright-report/
            retention-days: 30

    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v2
          with:
            version: 9
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: 'pnpm'

        - run: pnpm install
        - run: pnpm build
          env:
            DATABASE_URL: postgresql://placeholder:placeholder@localhost:5432/placeholder
            REDIS_URL: redis://localhost:6379

  ✅ Phase 1 Complete Checklist:
  - [ ] Sentry capturing errors in production
  - [ ] Logs visible in Axiom dashboard
  - [ ] All API routes have tests (>70% coverage)
  - [ ] E2E tests passing for critical flows
  - [ ] CI/CD pipeline green

  ---
  Phase 2: Auth Replacement (Week 3)

  Option A: Clerk Implementation (Recommended for SaaS)

  Day 1: Install Clerk

  cd apps/web
  pnpm add @clerk/nextjs

  cd apps/api
  pnpm add @clerk/clerk-sdk-node

  Day 2-3: Frontend Setup

  // apps/web/app/layout.tsx
  import { ClerkProvider } from '@clerk/nextjs';

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <ClerkProvider>
        <html>
          <body>{children}</body>
        </html>
      </ClerkProvider>
    );
  }

  // apps/web/middleware.ts
  import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

  const isPublicRoute = createRouteMatcher([
    '/',
    '/login(.*)',
    '/sign-up(.*)',
  ]);

  export default clerkMiddleware((auth, request) => {
    if (!isPublicRoute(request)) {
      auth().protect();
    }
  });

  export const config = {
    matcher: [
      '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
      '/(api|trpc)(.*)',
    ],
  };

  Day 4: Backend Integration

  // apps/api/src/middleware/auth.ts
  import { clerkClient } from '@clerk/clerk-sdk-node';

  export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    try {
      const session = await clerkClient.sessions.verifyToken(token);
      req.userId = session.userId;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'invalid_token' });
    }
  }

  Day 5: Migration Script

  // apps/api/scripts/migrate-to-clerk.ts
  import { db, users } from '../src/lib/db';
  import { clerkClient } from '@clerk/clerk-sdk-node';

  async function migrateUsers() {
    const existingUsers = await db.select().from(users);

    for (const user of existingUsers) {
      try {
        // Create Clerk user
        const clerkUser = await clerkClient.users.createUser({
          emailAddress: [user.email],
          firstName: user.displayName?.split(' ')[0],
          lastName: user.displayName?.split(' ').slice(1).join(' '),
          skipPasswordRequirement: true, // Send invitation email
        });

        // Update local DB with Clerk ID
        await db.update(users)
          .set({ clerkId: clerkUser.id })
          .where(eq(users.id, user.id));

        console.log(`Migrated user: ${user.email}`);
      } catch (err) {
        console.error(`Failed to migrate ${user.email}:`, err);
      }
    }
  }

  migrateUsers();

  Run migration:
  cd apps/api
  tsx scripts/migrate-to-clerk.ts

  Day 6-7: Remove Better Auth

  # Remove dependencies
  cd apps/api
  pnpm remove better-auth

  # Delete files
  rm -rf src/lib/auth.ts
  rm -rf src/routes/auth.ts

  # Drop tables (after backing up)
  psql devdocs -c "DROP TABLE IF EXISTS sessions CASCADE;"
  psql devdocs -c "DROP TABLE IF EXISTS accounts CASCADE;"

  Update schema:
  // apps/api/src/schema.ts
  export const users = pgTable("users", {
    id:          uuid("id").primaryKey().defaultRandom(),
    clerkId:     text("clerk_id").notNull().unique(), // NEW
    email:       text("email").notNull().unique(),
    displayName: text("display_name"),
    avatarUrl:   text("avatar_url"),
    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow(),
  });

  Environment Variables:
  # apps/web/.env.local
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
  CLERK_SECRET_KEY=sk_test_xxx

  # apps/api/.env
  CLERK_SECRET_KEY=sk_test_xxx

  ---
  Option B: Lucia Implementation (Self-Hosted Alternative)

  Due to length constraints, I'll provide key files only:

  cd apps/api
  pnpm add lucia @lucia-auth/adapter-postgresql

  // apps/api/src/lib/lucia.ts
  import { Lucia } from "lucia";
  import { PostgresJsAdapter } from "@lucia-auth/adapter-postgresql";
  import { db } from "./db";

  const adapter = new PostgresJsAdapter(db, {
    user: "users",
    session: "sessions"
  });

  export const lucia = new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: process.env.NODE_ENV === "production"
      }
    },
    getUserAttributes: (attributes) => {
      return {
        email: attributes.email,
    },
    getUserAttributes: (attributes) => {
      return {
        email: attributes.email,
        displayName: attributes.display_name,
      };
    }
  });

  declare module "lucia" {
    interface Register {
      Lucia: typeof lucia;
      DatabaseUserAttributes: {
        email: string;
        display_name: string | null;
      };
    }
  }

  Full Lucia implementation would take similar effort (3-5 days).

  ✅ Phase 2 Complete Checklist:
  - [ ] Clerk/Lucia installed and configured
  - [ ] Frontend auth flows working (login, signup, logout)
  - [ ] Backend auth middleware updated
  - [ ] User migration script run successfully
  - [ ] Better Auth completely removed
  - [ ] Auth integration tests passing
  - [ ] All existing users can log in

  ---
  ## Phase 3: Express → Hono Migration (Week 4)

  ### Day 1: Install Hono

  ```bash
  cd apps/api
  pnpm add hono @hono/zod-validator
  pnpm add -D @hono/node-server
  ```

  ### Day 2-3: Create Hono App Structure

  ```typescript
  // apps/api/src/hono-app.ts
  import { Hono } from 'hono';
  import { cors } from 'hono/cors';
  import { logger as honoLogger } from 'hono/logger';
  import { zValidator } from '@hono/zod-validator';
  import { ProjectCreateSchema } from '@devdocs/shared';

  const app = new Hono();

  // CORS middleware
  app.use('/*', cors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  }));

  // Logging middleware
  app.use('/*', honoLogger());

  // Health check
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      service: '@devdocs/api',
      timestamp: new Date().toISOString(),
    });
  });

  // Example route with Zod validation
  app.post(
    '/projects',
    zValidator('json', ProjectCreateSchema),
    async (c) => {
      const body = c.req.valid('json'); // Fully typed!
      const userId = c.get('userId'); // From auth middleware
      
      // Your logic here
      return c.json({ success: true, body });
    }
  );

  export default app;
  ```

  ### Day 4: Migrate Routes One by One

  **Projects Route:**

  ```typescript
  // apps/api/src/routes/hono/projects.ts
  import { Hono } from 'hono';
  import { zValidator } from '@hono/zod-validator';
  import { ProjectCreateSchema, ProjectUpdateSchema } from '@devdocs/shared';
  import { db, projects } from '../../lib/db';
  import { eq, and } from 'drizzle-orm';
  import { logger } from '../../lib/logger';

  const app = new Hono();

  // Middleware to get userId from context
  app.use('*', async (c, next) => {
    const userId = c.get('userId');
    if (!userId) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    await next();
  });

  // GET /projects - List all projects
  app.get('/', async (c) => {
    const userId = c.get('userId');
    
    try {
      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId));
      
      logger.info({ userId, count: userProjects.length }, 'Listed projects');
      return c.json(userProjects);
    } catch (err) {
      logger.error({ err, userId }, 'Failed to list projects');
      return c.json({ error: 'server_error' }, 500);
    }
  });

  // POST /projects - Create new project
  app.post(
    '/',
    zValidator('json', ProjectCreateSchema),
    async (c) => {
      const { name, type } = c.req.valid('json');
      const userId = c.get('userId');
      
      try {
        const [project] = await db
          .insert(projects)
          .values({ userId, name, type })
          .returning();
        
        logger.info({ userId, projectId: project.id }, 'Project created');
        return c.json(project, 201);
      } catch (err) {
        logger.error({ err, userId, name }, 'Failed to create project');
        return c.json({ error: 'server_error' }, 500);
      }
    }
  );

  // GET /projects/:id - Get single project
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, userId)),
    });
    
    if (!project) {
      return c.json({ error: 'not_found' }, 404);
    }
    
    return c.json(project);
  });

  // PATCH /projects/:id - Update project
  app.patch(
    '/:id',
    zValidator('json', ProjectUpdateSchema),
    async (c) => {
      const id = c.req.param('id');
      const userId = c.get('userId');
      const updates = c.req.valid('json');
      
      // Verify ownership
      const existing = await db.query.projects.findFirst({
        where: and(eq(projects.id, id), eq(projects.userId, userId)),
      });
      
      if (!existing) {
        return c.json({ error: 'not_found' }, 404);
      }
      
      await db
        .update(projects)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(projects.id, id));
      
      logger.info({ userId, projectId: id }, 'Project updated');
      return c.json({ success: true });
    }
  );

  // DELETE /projects/:id - Soft delete
  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, userId)),
    });
    
    if (!project) {
      return c.json({ error: 'not_found' }, 404);
    }
    
    await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(eq(projects.id, id));
    
    logger.info({ userId, projectId: id }, 'Project deleted');
    return c.json({ success: true });
  });

  export default app;
  ```

  ### Day 5: Auth Middleware for Hono

  ```typescript
  // apps/api/src/middleware/hono-auth.ts
  import { createMiddleware } from 'hono/factory';
  import { clerkClient } from '@clerk/clerk-sdk-node';

  export const requireAuth = createMiddleware(async (c, next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    
    try {
      const session = await clerkClient.sessions.verifyToken(token);
      c.set('userId', session.userId);
      await next();
    } catch (err) {
      return c.json({ error: 'invalid_token' }, 401);
    }
  });
  ```

  ### Day 6: Update Entry Point

  ```typescript
  // apps/api/src/index.ts
  import { serve } from '@hono/node-server';
  import { initSentry } from './lib/sentry';
  import honoApp from './hono-app';

  // Initialize Sentry
  initSentry();

  const PORT = Number(process.env.PORT || 4000);

  serve({
    fetch: honoApp.fetch,
    port: PORT,
  }, (info) => {
    console.log(`🚀 @devdocs/api (Hono) running at http://localhost:${info.port}`);
  });
  ```

  ### Day 7: Migrate Remaining Routes & Remove Express

  After migrating all routes:

  ```bash
  cd apps/api
  pnpm remove express @types/express cors @types/cors helmet compression cookie-parser
  ```

  **Benchmark Performance:**

  ```typescript
  // apps/api/scripts/benchmark.ts
  import autocannon from 'autocannon';

  const result = await autocannon({
    url: 'http://localhost:4000/health',
    connections: 100,
    duration: 10,
  });

  console.log(result);
  // Expect: 50k-100k req/s (vs Express: 10k-20k req/s)
  ```

  ✅ **Phase 3 Complete Checklist:**
  - [ ] Hono installed and configured
  - [ ] All routes migrated to Hono
  - [ ] Auth middleware working
  - [ ] All tests passing
  - [ ] Express completely removed
  - [ ] Performance benchmarks showing improvement

  ---
  ## Phase 4: tRPC Implementation (Week 5)

  ### Day 1: Install tRPC

  ```bash
  cd apps/api
  pnpm add @trpc/server

  cd ../web
  pnpm add @trpc/client @trpc/react-query @tanstack/react-query
  ```

  ### Day 2-3: Create tRPC Router

  ```typescript
  // apps/api/src/trpc/context.ts
  import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

  export async function createContext(opts: FetchCreateContextFnOptions) {
    const token = opts.req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return { userId: null };
    }
    
    try {
      const session = await clerkClient.sessions.verifyToken(token);
      return { userId: session.userId };
    } catch {
      return { userId: null };
    }
  }

  export type Context = Awaited<ReturnType<typeof createContext>>;
  ```

  ```typescript
  // apps/api/src/trpc/trpc.ts
  import { initTRPC, TRPCError } from '@trpc/server';
  import type { Context } from './context';

  const t = initTRPC.context<Context>().create();

  export const router = t.router;
  export const publicProcedure = t.procedure;

  // Protected procedure (requires auth)
  export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({
      ctx: {
        userId: ctx.userId,
      },
    });
  });
  ```

  ```typescript
  // apps/api/src/trpc/routers/projects.ts
  import { router, protectedProcedure } from '../trpc';
  import { ProjectCreateSchema, ProjectUpdateSchema } from '@devdocs/shared';
  import { z } from 'zod';
  import { db, projects } from '../../lib/db';
  import { eq, and } from 'drizzle-orm';

  export const projectsRouter = router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await db
          .select()
          .from(projects)
          .where(eq(projects.userId, ctx.userId));
      }),
    
    create: protectedProcedure
      .input(ProjectCreateSchema)
      .mutation(async ({ ctx, input }) => {
        const [project] = await db
          .insert(projects)
          .values({
            userId: ctx.userId,
            name: input.name,
            type: input.type,
          })
          .returning();
        
        return project;
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const project = await db.query.projects.findFirst({
          where: and(
            eq(projects.id, input.id),
            eq(projects.userId, ctx.userId)
          ),
        });
        
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        return project;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.string().uuid(),
        data: ProjectUpdateSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const existing = await db.query.projects.findFirst({
          where: and(
            eq(projects.id, input.id),
            eq(projects.userId, ctx.userId)
          ),
        });
        
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        await db
          .update(projects)
          .set({ ...input.data, updatedAt: new Date() })
          .where(eq(projects.id, input.id));
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.query.projects.findFirst({
          where: and(
            eq(projects.id, input.id),
            eq(projects.userId, ctx.userId)
          ),
        });
        
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        await db
          .update(projects)
          .set({ deletedAt: new Date() })
          .where(eq(projects.id, input.id));
        
        return { success: true };
      }),
  });
  ```

  ```typescript
  // apps/api/src/trpc/router.ts
  import { router } from './trpc';
  import { projectsRouter } from './routers/projects';

  export const appRouter = router({
    projects: projectsRouter,
    // Add more routers here
  });

  export type AppRouter = typeof appRouter;
  ```

  ### Day 4: Mount tRPC in Hono

  ```typescript
  // apps/api/src/hono-app.ts
  import { Hono } from 'hono';
  import { trpcServer } from '@trpc/server/adapters/fetch';
  import { appRouter } from './trpc/router';
  import { createContext } from './trpc/context';

  const app = new Hono();

  // ... existing middleware

  // Mount tRPC
  app.use('/trpc/*', async (c) => {
    const response = await trpcServer({
      router: appRouter,
      createContext: () => createContext({ req: c.req.raw, resHeaders: new Headers() }),
    })(c.req.raw);
    
    return response;
  });

  export default app;
  ```

  ### Day 5-6: Frontend Setup

  ```typescript
  // apps/web/lib/trpc.ts
  import { createTRPCReact } from '@trpc/react-query';
  import { httpBatchLink } from '@trpc/client';
  import type { AppRouter } from '@devdocs/api';

  export const trpc = createTRPCReact<AppRouter>();

  export const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
        headers: async () => {
          // Get auth token from Clerk
          const token = await getToken();
          return {
            Authorization: `Bearer ${token}`,
          };
        },
      }),
    ],
  });
  ```

  ```typescript
  // apps/web/app/layout.tsx
  import { ClerkProvider } from '@clerk/nextjs';
  import { trpc, trpcClient } from '@/lib/trpc';
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

  const queryClient = new QueryClient();

  export default function RootLayout({ children }) {
    return (
      <ClerkProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <html>
              <body>{children}</body>
            </html>
          </QueryClientProvider>
        </trpc.Provider>
      </ClerkProvider>
    );
  }
  ```

  ### Day 7: Update Components to Use tRPC

  **Before (REST API):**

  ```typescript
  // Old approach
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(setProjects);
  }, []);
  ```

  **After (tRPC):**

  ```typescript
  // New approach - fully typed!
  import { trpc } from '@/lib/trpc';

  export function ProjectList() {
    const { data: projects, isLoading } = trpc.projects.list.useQuery();
    const createMutation = trpc.projects.create.useMutation();

    const handleCreate = async () => {
      await createMutation.mutateAsync({
        name: 'New Project',
        type: 'saas',
      });
    };

    if (isLoading) return <div>Loading...</div>;

    return (
      <div>
        {projects?.map(p => <div key={p.id}>{p.name}</div>)}
        <button onClick={handleCreate}>Create</button>
      </div>
    );
  }
  ```

  ✅ **Phase 4 Complete Checklist:**
  - [ ] tRPC installed and configured
  - [ ] All routes available via tRPC
  - [ ] Frontend using tRPC for all API calls
  - [ ] Type safety verified (autocomplete working)
  - [ ] React Query caching working
  - [ ] All components migrated

  ---
  ## Phase 5: Email & Analytics (Week 6)

  ### Day 1-2: Email Service (Resend)

  ```bash
  cd apps/api
  pnpm add resend react-email
  ```

  ```typescript
  // apps/api/src/lib/email.ts
  import { Resend } from 'resend';

  const resend = new Resend(process.env.RESEND_API_KEY);

  export async function sendWelcomeEmail(email: string, name: string) {
    await resend.emails.send({
      from: 'DevDocs AI <noreply@yourdomain.com>',
      to: email,
      subject: 'Welcome to DevDocs AI',
      html: `<h1>Welcome ${name}!</h1><p>Thanks for signing up.</p>`,
    });
  }

  export async function sendProjectCompleteEmail(
    email: string,
    projectName: string,
    downloadLink: string
  ) {
    await resend.emails.send({
      from: 'DevDocs AI <noreply@yourdomain.com>',
      to: email,
      subject: `Your documentation for ${projectName} is ready`,
      html: `
        <h1>Documentation Complete!</h1>
        <p>Your documentation for <strong>${projectName}</strong> is ready.</p>
        <a href="${downloadLink}">Download Documentation</a>
      `,
    });
  }
  ```

  **Add to user registration:**

  ```typescript
  // After user signs up
  await sendWelcomeEmail(user.email, user.displayName);
  ```

  ### Day 3-4: Analytics (PostHog)

  ```bash
  cd apps/web
  pnpm add posthog-js
  ```

  ```typescript
  // apps/web/lib/analytics.ts
  import posthog from 'posthog-js';

  export function initAnalytics() {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: 'https://app.posthog.com',
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            posthog.opt_out_capturing();
          }
        },
      });
    }
  }

  export function trackEvent(event: string, properties?: Record<string, any>) {
    if (typeof window !== 'undefined') {
      posthog.capture(event, properties);
    }
  }

  export function identifyUser(userId: string, traits?: Record<string, any>) {
    if (typeof window !== 'undefined') {
      posthog.identify(userId, traits);
    }
  }
  ```

  ```typescript
  // apps/web/app/layout.tsx
  'use client';

  import { useEffect } from 'react';
  import { useUser } from '@clerk/nextjs';
  import { initAnalytics, identifyUser } from '@/lib/analytics';

  export default function RootLayout({ children }) {
    const { user } = useUser();

    useEffect(() => {
      initAnalytics();
      
      if (user) {
        identifyUser(user.id, {
          email: user.emailAddresses[0]?.emailAddress,
          name: user.fullName,
        });
      }
    }, [user]);

    return (
      <html>
        <body>{children}</body>
      </html>
    );
  }
  ```

  **Track key events:**

  ```typescript
  // Track project creation
  trackEvent('project_created', {
    projectType: type,
    userId,
  });

  // Track interview completion
  trackEvent('interview_completed', {
    projectId,
    domainsCompleted: 10,
    timeSpent: elapsed,
  });

  // Track documentation download
  trackEvent('documentation_downloaded', {
    projectId,
    format: 'markdown',
  });
  ```

  ### Day 5: Rate Limiting Upgrade (Unkey)

  ```bash
  cd apps/api
  pnpm add @unkey/api
  ```

  ```typescript
  // apps/api/src/middleware/rate-limit-unkey.ts
  import { Unkey } from '@unkey/api';

  const unkey = new Unkey({ token: process.env.UNKEY_ROOT_KEY });

  export async function rateLimitMiddleware(c: Context, next: Next) {
    const userId = c.get('userId');
    const identifier = userId || c.req.header('x-forwarded-for') || 'anonymous';
    
    const { result } = await unkey.limit(`user:${identifier}`, {
      limit: 100,
      duration: '1h',
    });
    
    if (!result.success) {
      return c.json({
        error: 'rate_limit_exceeded',
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      }, 429);
    }
    
    // Add rate limit headers
    c.header('X-RateLimit-Limit', String(result.limit));
    c.header('X-RateLimit-Remaining', String(result.remaining));
    c.header('X-RateLimit-Reset', String(result.reset));
    
    await next();
  }
  ```

  ### Day 6-7: Testing & Documentation

  - Write tests for email sending (mock Resend)
  - Test analytics events are firing
  - Test rate limiting
  - Update API documentation
  - Create runbook for common operations

  ✅ **Phase 5 Complete Checklist:**
  - [ ] Resend configured and sending emails
  - [ ] Welcome emails working
  - [ ] PostHog tracking key events
  - [ ] Analytics dashboard showing data
  - [ ] Unkey rate limiting working
  - [ ] All emails tested in staging
  - [ ] Analytics events documented

  ---
  ## Phase 6: Testing & Verification

  ### Week 6 Verification Tasks

  **API Tests:**
  - [ ] All API routes have unit tests
  - [ ] Integration tests for auth flows
  - [ ] Rate limiting tests
  - [ ] Error handling tests
  - [ ] Database transaction tests

  **Frontend Tests:**
  - [ ] E2E tests for critical user flows
  - [ ] Component tests for key UI elements
  - [ ] Auth flow E2E tests
  - [ ] Interview flow E2E tests

  **Performance Tests:**
  - [ ] API response time < 100ms (95th percentile)
  - [ ] AI streaming latency < 2s to first token
  - [ ] Frontend bundle size < 500KB
  - [ ] Lighthouse score > 90

  **Security Tests:**
  - [ ] SQL injection tests (should fail)
  - [ ] XSS tests (should fail)
  - [ ] CSRF protection working
  - [ ] Rate limiting preventing abuse
  - [ ] API keys properly encrypted

  **Load Tests:**
  ```bash
  # Test with 100 concurrent users
  pnpm dlx autocannon -c 100 -d 30 http://localhost:4000/health
  
  # Expected: >50k req/s, 0% errors
  ```

  ---
  ## Phase 7: Rollback Procedures

  ### If Something Goes Wrong

  **Phase 1 Rollback (Monitoring):**
  ```bash
  # Remove Sentry
  pnpm remove @sentry/node @sentry/nextjs
  # Revert to console.log
  git checkout HEAD~1 -- apps/api/src/lib/logger.ts
  ```

  **Phase 2 Rollback (Auth):**
  ```bash
  # Restore Better Auth
  git checkout main -- apps/api/src/lib/auth.ts
  pnpm add better-auth
  # Restore database tables
  psql devdocs < backup-auth-tables.sql
  ```

  **Phase 3 Rollback (Hono):**
  ```bash
  # Restore Express
  git checkout main -- apps/api/src/index.ts
  pnpm add express
  pnpm remove hono
  ```

  **Phase 4 Rollback (tRPC):**
  ```bash
  # Remove tRPC
  pnpm remove @trpc/server @trpc/client
  # Restore REST API calls
  git checkout main -- apps/web/components/
  ```

  **Emergency Rollback (Nuclear Option):**
  ```bash
  # Restore entire codebase
  git reset --hard main
  
  # Restore database
  pg_restore -d devdocs backup.sql
  
  # Redeploy
  pnpm install
  pnpm build
  ```

  ---
  ## Final Production Checklist

  **Before Going Live:**
  - [ ] All tests passing (>80% coverage)
  - [ ] Sentry configured and tested
  - [ ] Logging working (Axiom showing logs)
  - [ ] Auth fully migrated (Clerk/Lucia)
  - [ ] Hono performance verified (>50k req/s)
  - [ ] tRPC type safety working
  - [ ] Emails sending successfully
  - [ ] Analytics tracking events
  - [ ] Rate limiting preventing abuse
  - [ ] Database backups scheduled
  - [ ] SSL certificates configured
  - [ ] Environment variables set
  - [ ] CI/CD pipeline passing
  - [ ] Load tests passed
  - [ ] Security audit completed
  - [ ] Rollback procedures documented
  - [ ] Team trained on new stack
  - [ ] Monitoring alerts configured
  - [ ] Incident response plan ready

  ---
  ## Success Metrics

  **Performance:**
  - API response time: < 100ms (95th percentile)
  - Error rate: < 0.1%
  - Uptime: > 99.9%

  **Code Quality:**
  - Test coverage: > 80%
  - TypeScript strict mode: passing
  - No console.log in production

  **User Experience:**
  - Time to first token: < 2s
  - Page load time: < 1s
  - Zero auth failures

  ---
  ## Maintenance & Monitoring

  **Daily:**
  - Check Sentry for new errors
  - Review Axiom logs for anomalies
  - Monitor Clerk auth dashboard

  **Weekly:**
  - Review PostHog analytics
  - Check Unkey rate limit usage
  - Review performance metrics
  - Check test coverage

  **Monthly:**
  - Security updates
  - Dependency updates
  - Performance optimization
  - Cost optimization review

  ---
  **Implementation Guide Complete**

  Timeline: 6 weeks  
  Estimated Cost: $90-160/month (production)  
  Team Size: 1-2 developers  
  Production Ready: Yes (after completion)

  Good luck with the implementation! 🚀                 