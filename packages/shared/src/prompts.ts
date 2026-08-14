// packages/shared/src/prompts.ts
// Context-aware system prompt builder.
// Lives in shared so both apps/web (mock streaming) and apps/api
// (real streaming) build the same prompt from the same logic.
import type { ProjectContext, DomainId } from "./types";
import { PROJECT_TYPE_LABELS } from "./types";

const DOMAIN_LABELS: Record<DomainId, string> = {
  planning:     "Planning & Scope",
  architecture: "Architecture",
  database:     "Database Design",
  api:          "API Contracts",
  environment:  "Env Strategy",
  auth:         "Authentication",
  testing:      "Testing",
  monitoring:   "Monitoring",
  frontend:     "Frontend",
  deployment:   "Deployment",
};

const DOMAIN_FILES: Record<DomainId, string> = {
  planning:     "PLANNING.md",
  architecture: "ARCHITECTURE.md",
  database:     "DATABASE.md",
  api:          "API-CONTRACTS.md",
  environment:  "ENV-STRATEGY.md",
  auth:         "AUTH.md",
  testing:      "TESTING.md",
  monitoring:   "MONITORING.md",
  frontend:     "FRONTEND.md",
  deployment:   "DEPLOYMENT.md",
};

export function buildSystemPrompt(
  ctx:           ProjectContext,
  domainId:      DomainId,
  elaboration:   string,
  lockedChoices: Partial<Record<DomainId, Record<string, string>>>
): string {
  const typeLabel    = PROJECT_TYPE_LABELS[ctx.projectType];
  const domainLabel  = DOMAIN_LABELS[domainId];
  const domainFile   = DOMAIN_FILES[domainId];
  const choicesSummary = buildChoicesSummary(lockedChoices);
  const autoSchemaBlock = domainId === "database" ? getAutoSchemaHint(ctx, elaboration, lockedChoices) : "";

  return `You are a senior software architect helping a developer plan a ${typeLabel} project before writing any code. Your role is to ask precise, targeted questions and produce structured documentation that AI coding agents (Claude Code, Cursor, Windsurf) can consume directly.

## Project context
- Type: ${typeLabel}
- Team size: ${ctx.teamSize.replace("_", " ")}
- Timeline: ${ctx.timeline.replace(/_/g, " ")}
- Budget: ${ctx.budget}
- Experience level: ${ctx.experienceLevel}
${elaboration ? `- Project description: ${elaboration}` : "- Project description: not yet captured"}

## Decisions already locked
${choicesSummary || "None yet — this is the first domain."}
${autoSchemaBlock}

## Current domain
${domainLabel} (output file: ${domainFile})

## Behaviour rules
- Be direct and specific. No filler phrases ("Great question!", "Certainly!").
- Tailor every recommendation to the project context. A solo bootstrapped developer gets different advice than a funded team of 10.
- When a choice has already been locked, never re-ask for it. Reference it and build on it.
- For open-ended domains (planning, api, frontend): ask exactly one focused question per turn, then wait.
- For document generation: output clean markdown only. No preamble or explanation around the markdown block.
${domainId === "database" ? "- Database is card-only: user picked platform only. Generate DATABASE.md with Platform, Rationale, and Data Model (3-5 tables, fields with TYPE and note, FKs, RLS where applicable). Do not ask user to define tables — propose and assume." : ""}

## Document output format (when generating)
\`\`\`
## [Domain Name]

**Key:** Value
**Another key:** Value

\`field_name\`, \`TYPE\`, route paths in backtick inline code
\`\`\`

Rules:
- Section titles: \`## Heading\` (exactly two hashes, no more)
- Key-value pairs: \`**Label:** value\`
- Code/identifiers: backtick inline code
- No HTML. No tables. No bullet lists unless genuinely appropriate.
- 150–300 words per domain section.`;
}

function getAutoSchemaHint(
  ctx: ProjectContext,
  elaboration: string,
  lockedChoices: Partial<Record<DomainId, Record<string, string>>>
): string {
  const platform = lockedChoices.database?.databasePlatform ?? "managed_postgres";
  const platformLabel: Record<string, string> = {
    supabase: "Supabase Postgres (RLS, auth.users)",
    managed_postgres: "Managed PostgreSQL",
    firebase: "Firebase Firestore",
  };
  const byType: Record<string, string> = {
    saas: "organizations, memberships (project_id, user_id, role), projects",
    api: "api_keys, webhooks, usage_events",
    internal_tool: "records, audit_logs, approvals",
    mobile: "users, devices, push_tokens",
    landing_page: "leads, analytics_events",
    other: "core entities inferred from description",
  };
  const hint = elaboration ? elaboration.slice(0, 120).replace(/\n/g, " ") : "core app entities";
  return `
## Auto schema hint (do not ask user — synthesize)
- Platform: ${platformLabel[platform] ?? platform}
- Start with users/profiles, then ${byType[ctx.projectType] ?? byType.other}
- Keep 3–5 tables, include id (uuid), created_at (timestamptz), FKs with cascade, RLS notes where applicable. Hint: "${hint}"`;
}

function buildChoicesSummary(
  lockedChoices: Partial<Record<DomainId, Record<string, string>>>
): string {
  const lines: string[] = [];
  for (const [domainId, choices] of Object.entries(lockedChoices)) {
    const label = DOMAIN_LABELS[domainId as DomainId] ?? domainId;
    for (const [, value] of Object.entries(choices ?? {})) {
      if (value === "skipped") {
        lines.push(`- ${label}: **Skipped — deferred to v2**`);
      } else if (value.startsWith("custom:")) {
        lines.push(`- ${label}: **Custom — ${value.slice(7)}**`);
      } else {
        lines.push(`- ${label}: **${value}**`);
      }
    }
  }
  return lines.join("\n");
}
