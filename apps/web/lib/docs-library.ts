// lib/docs-library.ts
import { DOMAINS, generateDoc } from "@/lib/interview/domains";
import { MOCK_PROJECTS, PROJECT_TYPE_BADGE_CLASS } from "@/lib/mock-projects";
import type { DomainId, ProjectContext } from "@/lib/types";

export interface LibraryDoc {
  id: string; project: string; projectBadgeClass: string;
  domainId: DomainId; domainLabel: string; file: string;
  date: string; content: string; snippet: string; order: number;
}

function mockCtx(): ProjectContext {
  return { projectType: "saas", teamSize: "solo", timeline: "1_3_months", budget: "bootstrapped", experienceLevel: "intermediate" };
}

export function buildLibraryDocs(): LibraryDoc[] {
  const docs: LibraryDoc[] = [];
  MOCK_PROJECTS.forEach((p, pi) => {
    DOMAINS.slice(0, p.domainsCompleted).forEach((d, di) => {
      const content = generateDoc(d.id, mockCtx(), {}, "");
      const snippetLine = content.split("\n").find((l) => l.startsWith("**")) ?? content.split("\n")[2] ?? "";
      docs.push({ id: `${p.id}-${d.id}`, project: p.name, projectBadgeClass: PROJECT_TYPE_BADGE_CLASS[p.type], domainId: d.id, domainLabel: d.label, file: d.file, date: p.updatedAt, content, snippet: snippetLine.replace(/\*\*/g, "").trim(), order: pi * 10 + di });
    });
  });
  return docs;
}
