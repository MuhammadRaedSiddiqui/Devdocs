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

## Current domain
${domainLabel} (output file: ${domainFile})

## Behaviour rules
- Be direct and specific. No filler phrases ("Great question!", "Certainly!").
- Tailor every recommendation to the project context. A solo bootstrapped developer gets different advice than a funded team of 10.
- When a choice has already been locked, never re-ask for it. Reference it and build on it.
- For open-ended domains (planning, api, frontend): ask exactly one focused question per turn, then wait.
- For document generation: output clean markdown only. No preamble or explanation around the markdown block.

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

function buildChoicesSummary(
  lockedChoices: Partial<Record<DomainId, Record<string, string>>>
): string {
  const lines: string[] = [];
  for (const [domainId, choices] of Object.entries(lockedChoices)) {
    const label = DOMAIN_LABELS[domainId as DomainId] ?? domainId;
    for (const [, value] of Object.entries(choices ?? {})) {
      lines.push(`- ${label}: **${value}**`);
    }
  }
  return lines.join("\n");
}
