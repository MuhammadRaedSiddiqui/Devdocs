import type { DomainId, ProjectContext, ProjectType } from "@/lib/types";

export interface Template {
  id: string;
  name: string;
  description: string;
  projectType: ProjectType;
  lockedContext: ProjectContext;
  lockedChoices: Partial<Record<DomainId, Record<string, string>>>;
  elaboration: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "nextjs-saas",
    name: "Next.js SaaS Starter",
    description: "Full-stack SaaS with auth, billing, and a dashboard. Optimized for solo founders shipping fast.",
    projectType: "saas",
    lockedContext: { projectType: "saas", teamSize: "solo", timeline: "3_6_months", budget: "self_funded", experienceLevel: "intermediate" },
    lockedChoices: { architecture: { pattern: "modular" }, auth: { authProvider: "supabase" }, deployment: { deploymentPlatform: "vercel" } },
    elaboration: "",
  },
  {
    id: "rest-api",
    name: "REST API Service",
    description: "Backend API with rate limiting, JWT auth, and Redis caching. Clean monolith deployed to Railway.",
    projectType: "api",
    lockedContext: { projectType: "api", teamSize: "small", timeline: "1_3_months", budget: "bootstrapped", experienceLevel: "intermediate" },
    lockedChoices: { architecture: { pattern: "monolith" }, deployment: { deploymentPlatform: "railway" } },
    elaboration: "",
  },
  {
    id: "internal-tool",
    name: "Internal Tool",
    description: "Admin panel or back-office tool for your team. Quick to ship with NextAuth and minimal infra.",
    projectType: "internal_tool",
    lockedContext: { projectType: "internal_tool", teamSize: "medium", timeline: "under_1_month", budget: "bootstrapped", experienceLevel: "intermediate" },
    lockedChoices: { auth: { authProvider: "nextauth" }, deployment: { deploymentPlatform: "vercel" } },
    elaboration: "",
  },
  {
    id: "mobile-rn",
    name: "Mobile App (React Native)",
    description: "Cross-platform mobile app with Supabase backend. Designed for a small team with 3-6 month runway.",
    projectType: "mobile",
    lockedContext: { projectType: "mobile", teamSize: "small", timeline: "3_6_months", budget: "self_funded", experienceLevel: "intermediate" },
    lockedChoices: { auth: { authProvider: "supabase" }, deployment: { deploymentPlatform: "vercel" } },
    elaboration: "",
  },
  {
    id: "landing-page",
    name: "Marketing Landing Page",
    description: "High-conversion marketing site with waitlist. Ship in under a week with zero backend.",
    projectType: "landing_page",
    lockedContext: { projectType: "landing_page", teamSize: "solo", timeline: "under_1_month", budget: "bootstrapped", experienceLevel: "intermediate" },
    lockedChoices: { deployment: { deploymentPlatform: "vercel" } },
    elaboration: "",
  },
  {
    id: "team-dashboard",
    name: "Team Dashboard SaaS",
    description: "Enterprise-grade SaaS with SSO, audit logs, and full observability. Built for funded teams at scale.",
    projectType: "saas",
    lockedContext: { projectType: "saas", teamSize: "large", timeline: "6_plus_months", budget: "funded", experienceLevel: "experienced" },
    lockedChoices: { architecture: { pattern: "modular" }, auth: { authProvider: "auth0" }, monitoring: { monitoringStack: "datadog" }, deployment: { deploymentPlatform: "aws" } },
    elaboration: "",
  },
];
