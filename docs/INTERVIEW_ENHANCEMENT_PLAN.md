# Interview Flow & Design Enhancement Plan — Database Card-Only

> **Decision:** `database` domain is **cards-only** (Supabase / Managed PG / Firebase). No schema tables, no field editors. Schema is auto-generated server-side from `projectType + elaboration + lockedChoices + chosen DB platform`. Non-technical users never see DDL.

**Repo:** `C:\Users\HP\OneDrive\Desktop\dev\devdocs-monorepo`  
**Branch:** `plan/interview-enhancement-db-card-only`  
**Date:** 2026-08-14  
**Status:** Draft — awaiting approval

---

## 1. Context & Constraints

**Current draft:** 10 domains, Zustand `store.ts` (630 lines) as FSM, `domains.ts` defines mode+relevantFor, `choices.ts` 3-4 cards per domain, `ChatPanel` streams via ` POST /ai/stream` SSE, `PreviewPanel` hidden until `isComplete`, debounced persist to `tRPC projects.update` every 500ms via queued saves.

**User constraint (this plan):** Database must not expose schema/table values. Keep schema internal, auto.

**Implication:** Purge `SchemaTable`, `schemaTables`, `schemaConfirmed`, `helpIndex`, `HELP_RESPONSES`, `addSchemaField`, `confirmSchema`, `showSchema` flags. Keep `DATABASE.md` generation but derived from choice + elaboration + auto-schema mapping, not user-authored tables.

---

## 2. Goals

- Non-technical completion rate **80%+** (currently ~60% dropoff at DB schema for solo/beginner)
- Interview time **6–8 min** for `saas solo` (now 10–12 min linear)
- Zero `dangerouslySetInnerHTML` outside sanitized path; WCAG 2.1 AA on interview route
- `isComplete` → download perceived latency < 1s (live preview)

**Non-goals:** Adding new domains; changing BYOK or Clerk; landing redesign.

---

## 3. Architecture Decisions

### 3.1 Database Domain

```
User picks: supabase | managed_postgres | firebase  (DomainPicker, one-tap)
    → lockDomainChoice("database","databasePlatform", value)
        → runReply(template) → AI generates DATABASE.md
        → server `buildSystemPrompt` now injects autoSchemaHint
        → no SchemaTable, no confirm regex
```

**Auto schema hint:** deterministic function `getAutoSchemaHint(ctx, elaboration, platform)` returns hint e.g. `"Supabase Postgres: start with auth.users + profiles, projects, memberships; RLS on all tables; …"` Injected into system prompt's `## Auto schema` section. AI expands into full `DATABASE.md` without user editing. Persisted as `domainContent["database"]` only — no `schemaTables` stored.

**Data model change:**

```ts
// before
interviewData: { lockedContext, lockedChoices, completedDomains, domainContent,
  conversationHistory, elaboration, schemaTables, schemaConfirmed }

// after
interviewData: { lockedContext, lockedChoices: Record<DomainId, Record<string,string>>,
  completedDomains, domainContent, conversationHistory, elaboration,
  autoSchemaVersion: 1 } // schemaTables/schemaConfirmed removed; fallback read ignores them
```

Migration: `resumeFromSaved` ignores legacy `schemaTables/schemaConfirmed` if present; `page.tsx` read validates with `ProjectContextSchema` and strips unknown keys.

### 3.2 Prompt Single-Sourcing

Delete `apps/web/lib/ai/systemPrompt.ts` (duplicate, never imported). Single source `packages/shared/src/prompts.ts`. Move `CARD_CHOICES` label resolution into shared helper.

New `buildSystemPrompt` signature:

```ts
buildSystemPrompt(ctx, domainId, elaboration, lockedChoices, autoSchemaHint?)
```

Section `## Decisions already locked` renders `Label: **Value — description**` not raw id.

### 3.3 File Inventory (touched)

`store.ts`, `domains.ts`, `choices.ts`, `ChatPanel.tsx`, `DomainPicker.tsx`, `ChoiceCard.tsx`, `PreviewPanel.tsx`, `DomainProgress.tsx`, `DiscoveryForm.tsx`, `interview/page.tsx`, `lib/ai/stream.ts`, `lib/ai/provider.ts`, `lib/session/logger.ts`, `components/ui/MarkdownRenderer.tsx`, `components/ui/BottomSheet.tsx`, `components/interview/ErrorBanner.tsx`, `packages/shared/src/{types,schemas,prompts,session-types}`, `apps/api/src/routes/hono/ai.ts`, `apps/api/src/lib/aiStream.ts`, `apps/web/app/globals.css`, `tailwind.config.ts`

---

## 4. Phases

### Phase 0 — Critical Fixes (P0) — 2 days

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 0.1 | **DB mode lock to `cards`** — ensure `domains.ts:12` `database: mode:"cards"`; delete `SchemaTable` usage in `ChatPanel`, remove `showSchema` branch in `store.sendMessage`, remove `schema` enum from `DomainMode`. | `domains.ts`, `store.ts`, `ChatPanel.tsx`, `lib/types.ts` | `grep -r showSchema` → 0 in `store.ts` |
| 0.2 | **Purge schema state** — delete `DEFAULT_SCHEMA`, `HELP_RESPONSES`, `helpIndex`, `schemaTables`, `schemaConfirmed`, `confirmSchema`, `addSchemaField`; update `InterviewState`, `initialPhases`, `resumeFromSaved`, `reset`, `page.tsx` autosave. | `store.ts`, `page.tsx` | legacy reads still hydrate |
| 0.3 | **Delete duplicate prompt** — remove `apps/web/lib/ai/systemPrompt.ts` | `systemPrompt.ts` | `rg systemPrompt` only shared |
| 0.4 | **Hydration picker restore** — `resumeFromSaved` must NOT strip `showCards`; `page.tsx` re-emits `runOpener(currentDomain)` when `!isComplete`. Add `projectId` guard. | `store.ts:592`, `page.tsx:99-120` | Refresh mid-cards shows picker |
| 0.5 | **Fix help dead code** — delete `HELP_RESPONSES` | `store.ts:484` | grep → 0 |
| 0.6 | **HTTP 429 mapping** — `stream.ts:31` map `429→rate_limit`, forward `Retry-After` | `stream.ts`, `ErrorBanner.tsx` | Rate-limit shows countdown |
| 0.7 | **Choice retry branch** — `ErrorBanner` retry distinguishes choice vs message; store `lastError: {source, domain, key, value}` | `store.ts`, `ErrorBanner.tsx` | Card retry re-locks |
| 0.8 | **Auto-schema hint** — `getAutoSchemaHint(ctx, elaboration, platform)` in `shared/prompts.ts`, injected for `database` only | `shared/prompts.ts`, `ai.ts` | `DATABASE.md` contains sensible tables |

**Exit criteria:** `pnpm typecheck` 3/3, `pnpm build` passes, manual refresh mid-domain preserves picker, DB flow is one-tap card → AI doc.

---

### Phase 1 — Flow Enhancements (P1) — 3–4 days

| # | Task | Rationale | Files |
|---|------|-----------|-------|
| 1.1 | **Skip/NA card** — add `skipped` choice to every card domain; prompt renders `— deferred`; `buildFullDocument` renders `_(deferred)_`. | Reduces forced picks | `choices.ts`, `ChoiceCard.tsx`, `prompts.ts` |
| 1.2 | **One-tap select + undo** — `DomainPicker` removes `Confirm →`; `onSelect` immediately locks, shows `Toast "Architecture: Monolith — Undo"` 2.5s. | 30% time save | `DomainPicker.tsx`, `ToastStack` |
| 1.3 | **Custom label fix** — store `{isCustom, label}` not `custom_…` id | C2 leak | `DomainPicker.tsx:30`, `store.ts` |
| 1.4 | **Examples for open domains** — chip examples that fill input on tap; ghost defaults in `DiscoveryForm` | Blank-page | `DiscoveryForm.tsx`, `domains.ts` |
| 1.5 | **Fix terracotta token** — `--accent: #d97757` for active dot | Active==completed | `globals.css` |
| 1.6 | **Validation** — `elaboration` 20-char min, custom label 3–40 chars | Garbage input | `DiscoveryForm.tsx`, `DomainPicker.tsx` |

---

### Phase 2 — Adaptive & Rich Prompt (P1–P2) — 4–5 days

| # | Task | Detail |
|---|------|--------|
| 2.1 | **Adaptive branching** — `getNextDomain(current, ctx, lockedChoices, active)` rule tree | Cuts 8–10 → 5–7 |
| 2.2 | **Back / revisit** — `DomainProgress` rows clickable when done; URL `?domain=auth` | Misclick recovery |
| 2.3 | **Richer prompt** — label + description, few-shot example, cap `elaboration` 800 chars | Docs quality |
| 2.4 | **Conversation history** — client sends last 6 messages as `history`; server forwards to `aiStream` | Multi-turn |
| 2.5 | **Provider per project** — move from `localStorage` global to `interviewData.provider` | Model leak |
| 2.6 | **Copy + per-bubble Retry** — `Bubble` gets `⧉ Copy` + `↻ Retry` | Usability |

---

### Phase 3 — Polish & Scale (P2) — 5 days

| # | Task | Detail |
|---|------|--------|
| 3.1 | **Live preview** — `PreviewPanel` not gated on `isComplete`; drawer always available | Verify docs live |
| 3.2 | **Stale-while-revalidate** — `placeholderData` + `Syncing…` + `sendBeacon` flush | Perceived 0s load |
| 3.3 | **Progress density** — `✓/●/○`, `~2m`, `Recommended` badge, `4 of 7 · ~6 min left` | Commitment |
| 3.4 | **A11y pass** — `radiogroup`, `aria-current`, dialog focus trap, `prefers-reduced-motion`, `axe` CI | WCAG AA |
| 3.5 | **Design token hygiene** — prune `stitch-*`, `vellum` alias → semantic, `100vh→100dvh`, tokenize one-offs | Debt |
| 3.6 | **Observability v2** — `interview_abandoned_at_domain`, `time_per_domain` histogram | A/B |

---

## 5. Testing Strategy

| Layer | Tests |
|-------|-------|
| Unit (Vitest) | `getNextDomain`, `getAutoSchemaHint`, `buildChoicesSummary` label resolution, `InterviewDataSchema` migration |
| Component | `DomainPicker` one-tap+undo, `DomainProgress` back, `DiscoveryForm` examples |
| E2E (Playwright) | `saas solo` → DB card → auto `DATABASE.md` snapshot → skip → complete → download |
| A11y | `axe-playwright` on interview route |

---

## 6. Risks

- Legacy `schemaTables` break hydration → `passthrough` + strip, vitest migration test
- One-tap without undo frustrates → undo toast + back (2.2)
- Branching reorders mid-flight → freeze `activeDomains` at `setLockedContext`

---

## 7. Ship Order

```
Week 0 (2d): 0.1–0.8 Critical fixes — DB card-only
Week 1 (3d): 1.1–1.6 Flow enhancements
Week 2 (4d): 2.1–2.3 Branching, back, prompt
Week 3 (3d): 2.4–2.7 History, provider, copy/retry
Week 4 (5d): 3.1–3.6 Live preview, a11y, tokens
```

**If only 3:** **One-tap (1.2) → Branching (2.1) → Live preview (3.1)**

Full plan: `.agent/plans/jolly-booping-tulip-agent-a88466aad38f1b795.md`
