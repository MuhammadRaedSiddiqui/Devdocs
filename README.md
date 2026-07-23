# DevDocs AI — Monorepo

Turborepo + pnpm monorepo containing the full DevDocs AI stack.

## Structure

```
apps/
  web/          Next.js 14 App Router — the frontend (Vercel)
  api/          Express.js API server  — AI streaming, auth, CRUD (Railway / Fly.io)
packages/
  shared/       Shared TypeScript types, Zod schemas, prompt builder
.github/
  workflows/
    ci.yml      TypeScript + lint + build on every PR
```

## Quick start

```bash
# 1. Install dependencies (from repo root)
pnpm install

# 2. Copy and fill env files
cp .env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# 3. Start both apps in parallel
pnpm dev
#   apps/web → http://localhost:3000
#   apps/api → http://localhost:4000
```

## Per-app commands

```bash
pnpm --filter @devdocs/web dev   # web only
pnpm --filter @devdocs/api dev   # api only
pnpm typecheck                   # check all packages
pnpm build                       # build everything
```

## Database

```bash
cd apps/api && pnpm drizzle-kit push      # push schema to DB (dev)
cd apps/api && pnpm drizzle-kit generate  # generate SQL migrations (prod)
```

## Deploy

| App | Platform | Notes |
|---|---|---|
| `apps/web` | Vercel | Set NEXT_PUBLIC_* env vars, auto-deploy on push |
| `apps/api` | Railway / Fly.io | Set all API env vars, PORT=4000 |

## OAuth callback URLs
- Google: `https://api.yourdomain.com/auth/callback/google`
- GitHub: `https://api.yourdomain.com/auth/callback/github`

## Prompt files (for Claude Code)
- `PROMPT_MIGRATION.md` — 6-phase migration prompts (Phases 4–6 still pending)
- `CLAUDE_CODE_PROMPTS.md` — 14 feature improvement prompts
- `PROMPT_01_AI_PROVIDERS.md` — dual-provider AI wiring prompt (already executed in apps/web)
