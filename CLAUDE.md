# CLAUDE.md — DevDocs AI

This file is read by Claude Code before every task. It contains everything
needed to work on this codebase without re-explaining context in prompts.
Keep it up to date as the project evolves.

---

## What this project is

DevDocs AI is a pre-build planning tool for developers. It runs a structured
AI interview across 10 planning domains (architecture, database design, auth,
etc.), then generates a complete documentation bundle that AI coding agents
(Claude Code, Cursor, Windsurf) can consume before writing any code.

**Core user flow:**
1. Developer creates a project on the dashboard (picks a name + type)
2. Fills in a 4-question discovery form (team size, timeline, budget, experience)
3. Works through a 10-domain AI interview — some domains use card pickers,
   some open text, one uses a schema suggestion table
4. Downloads a single merged `DOCUMENTATION.md` (or 10 separate files as ZIP)
5. Drops the docs folder into their repo and points their coding agent at it

**Business model:** BYOK (Bring Your Own Key) — users supply their own
Anthropic, OpenAI, or Amazon Bedrock credentials. DevDocs AI never stores
plaintext keys.

---

## Monorepo structure

```
devdocs-ai/
├── apps/
│   ├── web/                    Next.js 14 App Router + tRPC client (Vercel)
│   └── api/                    Hono server + tRPC router (Railway / Fly.io)
├── packages/
│   └── shared/                 Shared types, Zod schemas, prompt builder
├── .github/workflows/ci.yml
├── turbo.json
├── pnpm-workspace.yaml
├── CLAUDE.md                   ← you are here
├── IMPLEMENTATION_STRATEGY.md  6-phase implementation plan (Phases 2-4 complete)
├── PROMPT_01_AI_PROVIDERS.md   Anthropic + OpenAI dual-provider prompt (executed)
├── PROMPT_02_BEDROCK.md        Amazon Bedrock third-provider prompt
└── CLAUDE_CODE_PROMPTS.md      14 feature improvement prompts
```

---

## Tech stack

### apps/web (Next.js frontend)
| Concern | Tool | Notes |
|---|---|---|
| Framework | Next.js 14 App Router | All pages are `"use client"` — no RSC data fetching yet |
| State — interview | Zustand (`lib/interview/store.ts`) | The interview state machine. Never put interview state in React state |
| State — server data | TanStack Query via tRPC | Full-stack type safety. All queries auto-invalidate on mutation |
| API client | tRPC React (`@trpc/react-query`) | Type-safe API calls. Endpoint: `http://localhost:4000/trpc` |
| Styling | Tailwind CSS + CSS Modules | Vellum design system (see below) |
| Fonts | `next/font/google` — Lora + Inter | Self-hosted, no CDN. Variables: `--font-lora`, `--font-inter` |
| AI streaming | Server-side only | Fetches `/ai/stream` SSE endpoint. No `dangerouslyAllowBrowser` |
| Auth | Clerk | `@clerk/nextjs`. Token passed via `Authorization: Bearer` header |

### apps/api (Hono backend)
| Concern | Tool | Notes |
|---|---|---|
| Framework | Hono + TypeScript | `tsx watch` in dev, compiled to `dist/` in prod. 50k+ req/s |
| API layer | tRPC (`@trpc/server`) | Type-safe RPC. Router at `/trpc`. Uses Fetch adapter |
| Database | PostgreSQL via Drizzle ORM | Schema in `src/schema.ts`. Use `drizzle-kit generate` for migrations |
| Cache / rate limits | Upstash Redis | Rate limit counters, 24h AI response cache |
| Auth | Clerk | `@clerk/express`. Middleware verifies tokens, maps to local UUID |
| AI streaming | SSE endpoint `POST /ai/stream` | Reads encrypted key from DB, streams to client via ReadableStream |
| Key vault | AES-256-GCM (`src/lib/crypto.ts`) | Keys encrypted at rest. Never returned after save |

### packages/shared
- `src/types.ts` — all shared TypeScript types (`Project`, `DomainId`, `AIProvider`, etc.)
- `src/schemas.ts` — Zod schemas for all API request/response shapes
- `src/prompts.ts` — `buildSystemPrompt()` used by both web (mock) and api (real)
- `src/index.ts` — barrel export

**Rule:** If a type is needed in both `apps/web` and `apps/api`, it lives in
`packages/shared`. Never duplicate types across apps.

---

## Development workflow

```bash
# Start both apps (from repo root)
pnpm dev
# apps/web → http://localhost:3000
# apps/api → http://localhost:4000

# Individual apps
pnpm --filter @devdocs/web dev
pnpm --filter @devdocs/api dev

# Typecheck everything before committing
pnpm typecheck

# Push DB schema changes (never write raw SQL)
cd apps/api && pnpm drizzle-kit push
```

### Environment setup
```bash
cp .env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
# Fill in DATABASE_URL, UPSTASH_REDIS_*, SESSION_SECRET,
# ENCRYPTION_KEY, GOOGLE_CLIENT_ID/SECRET, GITHUB_CLIENT_ID/SECRET
```

`ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Design system — Vellum

All UI uses the Vellum design system. Never introduce new colours or spacing
outside this system.

### Key tokens (CSS custom properties in `app/globals.css`)
```css
--vellum-bg:           #faf9f5   /* page background — cream */
--vellum-surface:      #ffffff   /* card surfaces */
--vellum-border:       #dedcd1   /* primary borders */
--vellum-border-light: #ece9e1   /* subtle borders */
--ink:                 #141413   /* primary text */
--ink-secondary:       #3d3d3a   /* secondary text */
--ink-muted:           #73726c   /* muted text */
--ink-faint:           #9c9a92   /* placeholder/faint text */
--terracotta:          #d97757   /* brand accent */
--danger:              #c0392b   /* destructive actions */
--danger-bg:           #fdf2f2
--danger-border:       #f3c4c4
```

### Tailwind utilities to use
```
bg-vellum         border-vellum-border     text-ink
bg-vellum-surface border-vellum-border-light text-ink-secondary
rounded-vellum    (= 9.6px)                text-ink-muted
text-terracotta   bg-ink text-vellum        text-ink-faint
```

### Typography
- Headings: `font-serif-heading` class → Lora, weight 400
- Body: `font-sans` → Inter (default on `<body>`)
- Code: `font-mono` → JetBrains Mono / Menlo

### Badge colour pairs (for project type chips)
```
.badge-blue    .badge-green    .badge-amber    .badge-purple    .badge-orange
```

### Border radius
Always `rounded-vellum` (9.6px) for cards and inputs. Never use `rounded` or
`rounded-lg` unless matching a specific pre-existing element.

### Card pattern
```tsx
<div className="bg-white border border-vellum-border rounded-vellum p-4">
```

### No shadows — borders only
DevDocs AI uses border-based depth, never `shadow-*` classes. Exception: modals
use a single `shadow-2xl` on the overlay card.

---

## Interview state machine

The Zustand store in `apps/web/lib/interview/store.ts` is the most important
file in the codebase. Understand it before touching anything interview-related.

### Domain modes
Each of the 10 domains has one of three interaction modes:

| Mode | Domains | Behaviour |
|---|---|---|
| `"open"` | planning, api, frontend | AI asks one question, user types a free-text answer, AI generates the doc section |
| `"cards"` | architecture, environment, auth, testing, monitoring, deployment | Inline card grid rendered inside a chat bubble. User picks one, AI confirms + generates |
| `"schema"` | database | AI proposes a starter schema table, user edits/confirms, AI generates |

### Key invariants — never regress these

1. **Project type is captured ONCE** in the "New Project" modal on the dashboard.
   `DiscoveryForm` shows it as a read-only locked chip. It must never ask for
   the project type again inside the interview.

2. **Planning domain never asks context it already has.** It asks exactly one
   open question — "tell me about your project" — and the answer (`elaboration`
   in the store) is used by every later domain's system prompt.

3. **Card pickers render INLINE inside chat bubbles.** They use the `showCards`
   flag on a `ChatMessage`. Never redirect to a separate page or panel for cards.

4. **Database domain suggests a schema first.** It never asks "list your entities
   cold." The AI proposes a starter schema; the user can ask for help, add fields,
   or use the inline "+ Add" row. Only an explicit "Looks good" advances the domain.

5. **Preview panel is hidden during the interview** (`width: 0`). It slides in
   only once `store.isComplete === true`. Do not show partial documents while
   the interview is running.

6. **Single merged DOCUMENTATION.md** — the output is one file, not ten. The
   10-file ZIP export is a separate feature.

7. **`sendMessage` keeps working after `isComplete`.** Post-completion messages
   trigger a clarification flow, not an error.

### Adding a new domain
1. Add the domain definition to `DOMAINS` in `lib/interview/domains.ts`
2. Add its choices (if `cards` mode) to `CARD_CHOICES` in `lib/interview/choices.ts`
3. Add its opener to `getOpener()` in `domains.ts`
4. Add its doc template to `generateDoc()` in `domains.ts`
5. Add it to `DomainId` in `packages/shared/src/types.ts`
6. Add it to the Zod enum in `packages/shared/src/schemas.ts`
7. The store, ChatPanel, DomainProgress, and PreviewPanel all read from `DOMAINS`
   dynamically — they do not need changes for new domains.

---

## API design

### Base URL
- Dev: `http://localhost:4000`
- Prod: `https://api.devdocs.ai`

### Auth
All tRPC routes use the `protectedProcedure` which requires a valid Clerk token
in the `Authorization: Bearer` header. The context middleware verifies the token,
fetches the user from Clerk, and maps to the local UUID via `getOrCreateUser()`.

### Route structure
```
GET    /health                     Public health check (Hono REST)
ALL    /trpc/*                     tRPC endpoint (type-safe RPC over HTTP POST)
POST   /ai/stream                  SSE — stream an AI response (Hono REST)
POST   /keys                       Verify + save a new API key (Hono REST)
DELETE /keys/:provider             Remove a key (Hono REST)
```

### tRPC Procedures (all under `/trpc`)
```
projects.list                       List user's projects
projects.get({ id })                Get single project (includes interviewData)
projects.create({ name, type })     Create project
projects.update({ id, data })       Update project / save interview progress
projects.delete({ id })             Soft delete
```

### SSE streaming format
Every event from `POST /ai/stream` is a JSON-encoded SSE data line:
```
data: {"type":"token","text":"accumulated text so far"}\n\n
data: {"type":"done","text":"full completed text"}\n\n
data: {"type":"error","errorType":"auth","message":"..."}\n\n
```
The client reads `type` to decide whether to update the streaming bubble,
commit the final message, or show an error banner.

### Error response shape
```json
{ "error": "snake_case_code", "message": "Human-readable string." }
```
Use these error codes consistently:
- `unauthorized` — no session or session invalid
- `not_found` — resource doesn't exist or belongs to another user
- `validation_error` — Zod parse failure (includes `fields` map)
- `rate_limit` — Redis rate limiter fired
- `no_key` — no API key stored for this provider
- `bedrock_not_configured` — AWS env vars missing
- `server_error` — unexpected internal error

---

## AI providers

Three providers are supported. All streaming goes through a single
`streamAIResponse()` function — callers never know which provider is active.

| Provider | Auth | Where keys live | Notes |
|---|---|---|---|
| Anthropic | `x-api-key` header | User's Postgres row (encrypted) | Default provider |
| OpenAI | `Authorization: Bearer` | User's Postgres row (encrypted) | |
| Bedrock | AWS env vars | `apps/api/.env` | Server-only. Not user-configurable |

**Apps/web** (pre-Phase 5): keys in `localStorage`, streaming from browser via
`dangerouslyAllowBrowser: true`.

**Apps/api** (post-Phase 5): keys in Postgres encrypted with AES-256-GCM,
streaming from the Express server. Browser never touches a key after submitting
it to `POST /keys`.

### System prompt
`buildSystemPrompt()` in `packages/shared/src/prompts.ts` builds a
context-rich prompt from:
- `lockedContext` (project type, team size, timeline, budget, experience)
- `elaboration` (the user's free-text project description from the planning domain)
- `lockedChoices` (all card selections made so far)
- `domainId` (which domain is currently active)

This prompt is identical for all providers. Never hardcode prompts outside this function.

---

## Database

### Schema overview (`apps/api/src/schema.ts`)
```
users               id (uuid), clerk_id (text, unique), email, display_name, avatar_url
projects            id, user_id → users, name, type, status, interview_data (JSONB), deleted_at
documentation_bundles  id, project_id → projects, domain_id, content
user_api_keys       id, user_id → users, provider, key_hash (AES encrypted), masked_key
```

**Note:** No `sessions` or `accounts` tables. Clerk handles authentication;
the API only stores a mapping from `clerk_id` → local `uuid` for relational integrity.

### `interview_data` JSONB shape
```ts
{
  lockedContext:       ProjectContext,
  lockedChoices:       Record<DomainId, Record<string, string>>,
  completedDomains:    DomainId[],
  domainContent:       Record<DomainId, string>,
  conversationHistory: ChatMessage[],
  elaboration:         string,
  schemaTables:        SchemaTables,
  schemaConfirmed:     boolean,
}
```
This mirrors `InterviewData` in `packages/shared/src/types.ts`.

### Migrations
- Dev: `pnpm drizzle-kit push` — applies schema changes directly. Fast, no files.
- Prod: `pnpm drizzle-kit generate` → commit the SQL file → run in CI.
- Never write raw SQL migrations by hand. Always go through Drizzle.
- Soft deletes only — use `deleted_at` timestamp. Never hard-delete projects.

### Redis key conventions
```
ratelimit:{userId}:{method}:{path}     Rate limit counter (TTL = window seconds)
ai:doc:{projectId}:{domainId}          Cached AI doc section (TTL = 86400s / 24h)
```

---

## Testing the interview end-to-end

**All AI streaming now requires a valid API key** — there is no mock mode.
The frontend calls the `/ai/stream` endpoint on the Hono API, which decrypts
the user's stored key and streams from Anthropic or OpenAI.

To test:
1. Sign in with Clerk
2. Go to Settings → API Key
3. Add your Anthropic or OpenAI key (verified + encrypted server-side)
4. Create a project and start the interview

---

## Common tasks

### Add a new settings section
1. Add the section ID to `SettingsSection` type in `components/settings/SettingsSidebar.tsx`
2. Create `components/settings/YourSection.tsx` following the same Card/Field/PageHeader pattern
3. Add the route condition in `app/(app)/settings/page.tsx`
4. Add the sidebar item in `SettingsSidebar.tsx`

### Add a new tRPC procedure
1. Add the procedure to the appropriate router in `apps/api/src/trpc/routers/`
2. Add a Zod schema for input/output in `packages/shared/src/schemas.ts`
3. Use `.input(YourSchema)` and `.query()` or `.mutation()`
4. Export from the router and mount in `apps/api/src/trpc/router.ts`
5. The frontend gets automatic type inference — no manual types needed

### Add a new Hono REST endpoint (for SSE or webhooks)
1. Create the route in `apps/api/src/routes/hono/`
2. Add middleware: `app.use('*', requireClerkAuth)` if protected
3. Mount in `apps/api/src/hono-app.ts`: `app.route('/your-path', yourRouter)`
4. Hono is only for SSE streaming or non-RPC endpoints. Prefer tRPC for CRUD.

### Add a new page to apps/web
1. Create the file at the correct path under `app/(app)/` or `app/(auth)/`
2. Add `"use client"` at the top if it uses hooks or browser APIs
3. Update `middleware.ts` if the route has different auth requirements
4. Update the `<Navbar active="...">` prop if it's a top-level nav page

### Change the AI system prompt
Edit `buildSystemPrompt()` in `packages/shared/src/prompts.ts` only.
The function is used by both `apps/web` (mock) and `apps/api` (real).
Test with the mock first (no API cost), then verify with a real key.

---

## What not to do

- **Never call the Anthropic or OpenAI SDK directly in a component.** All AI
  calls go through `lib/interview/store.ts` → `lib/ai/stream.ts`. This keeps
  streaming state, error handling, and AbortController management in one place.

- **Never import from `apps/web` inside `apps/api` or vice versa.** Shared code
  belongs in `packages/shared`. Cross-app imports will break the build pipeline.

- **Never use `localStorage` for API keys in new code.** Pre-Phase 5 the web app
  does this, but all new key handling goes through `POST /keys` to the Express
  server. The localStorage path is technical debt being retired.

- **Never use `dangerouslySetInnerHTML` with unsanitised user content.** The four
  existing uses (`PreviewPanel`, `DocPreview`, `DocList`, `ChatPanel`) are on the
  roadmap to be replaced with `react-markdown` + `rehype-sanitize` (see
  `CLAUDE_CODE_PROMPTS.md` Prompt 10).

- **Never add `shadow-*` classes.** Vellum uses borders for depth, not shadows.
  The one exception is `shadow-2xl` on modal overlay cards.

- **Never use `px` values for colours** — always reference CSS custom properties
  or Tailwind tokens. Hardcoded hex in JSX is only acceptable for inline styles
  where Tailwind doesn't reach (e.g. `style={{ background: "#fdf2f2" }}`).

- **Never modify `DOMAINS` order in `lib/interview/domains.ts`.** The order
  determines interview progression. Adding domains should append to the end
  unless there's a strong product reason to reorder, in which case also update
  all test fixtures and seed data.

- **Never break the middleware.ts route protection rules.** Protected prefixes:
  `/dashboard`, `/project`, `/settings`, `/docs`. Public: `/`, `/sign-in`,
  `/sign-up`. Clerk handles auth — middleware only redirects unauthenticated
  users to `/sign-in`. No auth config in the API beyond token verification.

---

## Pending work (do not implement without a prompt file)

The following features are specced but not yet built. Reference the
corresponding prompt file before starting work on any of them.

| Feature | Prompt file | Status |
|---|---|---|
| Clerk auth + tRPC + server streaming | `IMPLEMENTATION_STRATEGY.md` Phases 1-4 | ✅ **Complete** |
| Amazon Bedrock provider | `PROMPT_02_BEDROCK.md` | ✅ **Complete** |
| Error states + timeout handling | `CLAUDE_CODE_PROMPTS.md` Prompt 4 | ✅ **Complete** |
| Domain skipping by project type | `CLAUDE_CODE_PROMPTS.md` Prompt 5 | ✅ **Complete** |
| Inline document editing | `CLAUDE_CODE_PROMPTS.md` Prompt 6 | ✅ **Complete** |
| ZIP export | `CLAUDE_CODE_PROMPTS.md` Prompt 7 | ✅ **Complete** |
| Cmd+K search | `CLAUDE_CODE_PROMPTS.md` Prompt 9 | ✅ **Complete** |
| react-markdown + XSS safety | `CLAUDE_CODE_PROMPTS.md` Prompt 10 | ✅ **Complete** |
| Global toast provider | `CLAUDE_CODE_PROMPTS.md` Prompt 11 | ✅ **Complete** |
| Mobile responsive layout | `CLAUDE_CODE_PROMPTS.md` Prompt 12 | ✅ **Complete** |
| Templates page | `CLAUDE_CODE_PROMPTS.md` Prompt 13 | ✅ **Complete** |
| Loading skeletons | `CLAUDE_CODE_PROMPTS.md` Prompt 14 | ✅ **Complete** |

---

## Deployment

### apps/web → Vercel
- Framework preset: Next.js
- Build command: `pnpm --filter @devdocs/web build`
- Output directory: `apps/web/.next`
- Root directory: leave blank (Vercel detects Turborepo automatically)
- Environment variables: all `NEXT_PUBLIC_*` vars

### apps/api → Railway
- Start command: `node dist/hono-server.js`
- Build command: `pnpm --filter @devdocs/api build`
- Environment variables: `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN`, `ENCRYPTION_KEY`, `CLERK_SECRET_KEY`,
  `CLERK_PUBLISHABLE_KEY`, `WEB_URL`, `PORT`

### Clerk setup
- Create a Clerk application at https://dashboard.clerk.com
- Enable sign-in/sign-up in the Clerk dashboard
- Add environment variables to both apps/web and apps/api
- No OAuth callback URLs needed — Clerk handles all OAuth flows

### CI (GitHub Actions)
`.github/workflows/ci.yml` runs on every push and PR:
- `pnpm typecheck` — TypeScript across all packages
- `pnpm --filter @devdocs/web lint` — ESLint on apps/web
- `pnpm --filter @devdocs/web build` — Next.js build check

Merging to `main` without a green CI run is not permitted.
