# DevDocs AI implementation strategy

## Objective

Turn the current UI prototype and parallel backend migration into one secure,
deployable product with Clerk authentication, durable project data, and
server-side AI generation.

## Target architecture

```text
Browser (Next.js + Clerk)
  ├─ tRPC over HTTPS: projects, documents, API-key metadata
  └─ REST/SSE over HTTPS: AI generation stream
                         ↓
Hono API (single production server)
  ├─ Clerk token verification
  ├─ tRPC application router
  ├─ AI streaming route
  ├─ PostgreSQL via Drizzle
  └─ Upstash Redis (rate limits and generated-doc cache)
```

Hono is the canonical API runtime. tRPC is used for request/response product
operations; Hono REST remains only where Server-Sent Events are appropriate.
The existing Express server is removed only after the replacement passes all
tests and production smoke checks.

## Decisions to make before implementation

1. Use server-managed BYOK keys. API keys are submitted once over HTTPS,
   encrypted with AES-256-GCM, stored in Postgres, and never returned. Remove
   browser storage and browser-direct provider calls.
2. Preserve the existing UUID database keys and map each Clerk ID through
   `users.clerk_id`. All database access uses the resolved local UUID; Clerk
   IDs remain available only for authentication and external integrations.
3. Deploy one API service. Web receives `NEXT_PUBLIC_API_URL`; API receives
   Clerk, database, Redis, encryption, observability, and provider settings.

## Phase 0 — Baseline and safety (1–2 days)

- Install and pin pnpm 9 through Corepack; document the supported Node 20 LTS
  runtime rather than the currently installed Node 24.
- Run `pnpm install --frozen-lockfile`, `pnpm typecheck`, lint, API tests,
  E2E tests, and production builds. Record all initial failures as issues.
- Add a temporary CI job that runs every available quality gate, including the
  API build (CI currently builds only the web app).
- Create separate dev/staging/production Clerk instances and databases. Never
  test schema migrations against production.

**Exit condition:** baseline commands are reproducible locally and in CI.

## Phase 1 — Repair identity and persistence (2–3 days)

### Database migration

Create a new, forward-only Drizzle migration that:

1. Adds a text Clerk identity column to `users` and backfills it where known.
2. Converts `users.id` and every foreign key that references it to `text`, or
   creates a strict `clerk_id -> UUID` resolver if preserving UUID keys is a
   non-negotiable data constraint.
3. Adds `not null`, foreign keys, and indexes for project ownership and key
   lookups.
4. Removes obsolete `sessions` and `accounts` tables after confirming no code
   depends on the old authentication system.

The implementation must not mix both ID forms. Add a `getOrCreateUser` helper
that upserts the local user from verified Clerk claims before every first write.

### Tests

- Add migration tests against a disposable PostgreSQL database.
- Add API tests proving that a Clerk-style ID such as `user_123` can create,
  list, update, and soft-delete only its own projects.
- Test cross-user access attempts for projects, documents, and API keys.

**Exit condition:** an authenticated user can reliably persist and retrieve a
project using the production schema.

## Phase 2 — Consolidate the API (3–5 days)

### Hono and tRPC

- Promote `hono-server.ts` to the only API entry point and make `pnpm dev`
  start it on port 4000.
- Move the Express project functionality into the existing tRPC projects
  router. Preserve validation through shared Zod schemas.
- Add tRPC routers for API-key metadata and documentation-bundle reads.
- Keep `POST /ai/stream` and `POST /ai/invalidate` as Hono REST endpoints with
  SSE; tRPC is not required for streamed token delivery.
- Move shared authentication, error response, request IDs, rate limiting,
  logging, CORS, and Sentry handling into Hono middleware.
- Delete Express-specific routes, middleware, dependencies, and scripts only
  after parity tests pass.

### Contract alignment

- Set a single `NEXT_PUBLIC_API_URL` default (`http://localhost:4000`).
- Update Next rewrites, tRPC client, Playwright web-server configuration, API
  scripts, and deployment documentation together.
- Remove performance marketing claims from source comments unless benchmarked
  in this application and continuously verified.

**Exit condition:** no frontend route or deployment configuration references
Express or port 4001; all API smoke tests run against Hono.

## Phase 3 — Connect the frontend to real data (4–6 days)

### Projects

- Replace `MOCK_PROJECTS` in dashboard, sidebar, and interview pages with
  tRPC queries and mutations.
- Use server-generated UUIDs. Do not create IDs from `Date.now()`.
- Add loading, empty, error, retry, optimistic-delete, and mutation feedback
  states.
- Persist interview state after discovery submission and after each completed
  domain; hydrate the Zustand store from the project’s `interviewData` on page
  load.

### Documentation

- Write completed AI responses to `documentation_bundles` rather than treating
  Redis as persistent storage.
- Load the docs library from the database, scoped to the signed-in user.
- Implement download/export from persisted documentation, not generated mock
  strings.

**Exit condition:** a user can create a project, refresh at any stage, resume
the interview, and view/download generated documents from another session.

## Phase 4 — Secure AI key and streaming behavior (3–5 days)

- Replace the browser-side `localStorage` provider implementation with calls
  to authenticated API-key endpoints.
- Remove `dangerouslyAllowBrowser` and both AI SDK imports from `apps/web`.
- Keep raw keys exclusively in API memory during validation/streaming and
  encrypted in Postgres at rest. Log provider, request ID, and outcome only;
  never log keys or prompt bodies by default.
- Move provider validation and streaming to the Hono API. Use a short timeout,
  upstream abort on disconnect, provider-specific error mapping, and a
  per-user/provider rate limit.
- Before returning a cached document or invalidating a key, verify project
  ownership. Cache keys should include a version/hash of the relevant
  interview state so stale output cannot be reused after edits.
- Update all user-facing privacy copy to accurately state the chosen
  server-managed BYOK model.

**Exit condition:** browser storage contains no API key; provider requests only
originate from the API; keys are never returned after save.

## Phase 5 — Configuration, docs, and deployment (2–3 days)

- Replace `.env.example` with only active variables, divided by web/API, and
  add required Clerk variables. Remove legacy Supabase, OAuth, session, and
  obsolete Redis variables if unused.
- Update README, quick start, deployment guide, and architecture docs to name
  Clerk, Hono, tRPC, PostgreSQL, Redis, and the actual ports/routes.
- Validate all required environment variables at API boot with clear errors.
- Configure production CORS to use an allowlist; do not use wildcard origins
  with credentials.
- Add health/readiness endpoints that test only appropriate dependencies.

**Exit condition:** a new developer can start the full stack from README and a
staging deployment succeeds from documented configuration alone.

## Phase 6 — Quality gates and rollout (ongoing)

- Unit test shared schemas, crypto format handling, identity resolution, and
  interview-state transformations.
- Integration test auth, ownership rules, project persistence, key lifecycle,
  cache behavior, and SSE error paths against Postgres/Redis.
- Make E2E tests use Clerk’s test mode; cover sign-in, project creation,
  refresh/resume, API-key save/removal, and document generation with mocked AI.
- CI must run: lockfile install, typecheck, lint, API build, unit/integration
  tests, E2E tests, and both production builds.
- Deploy to staging, run smoke tests, enable Sentry alerts, then release using
  a canary or small internal cohort before general availability.

## Delivery sequencing and rollback

Ship Phases 1–2 behind an API compatibility layer, then Phase 3 behind a
frontend feature flag. Do not remove the old Express endpoint until the Hono
route has processed real staging traffic successfully. Database migrations are
forward-only: take a backup, deploy additive changes first, backfill and
validate, switch reads/writes, then remove legacy columns/tables in a later
release.

## Definition of done

- One Hono API service on one documented port and URL.
- One authoritative Clerk-to-database user-ID strategy.
- No mock data on authenticated product routes.
- No user API keys in browser storage or client bundles.
- Generated documents are persistent, user-scoped, and reloadable.
- Docs, environment templates, CI, tests, and deployment configuration match
  the running system.
