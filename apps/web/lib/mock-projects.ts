import type { Project } from "@/lib/types";
export const MOCK_PROJECTS: Project[] = [
  { id: "1", name: "DevDocs AI", type: "saas", status: "in_progress", domainsCompleted: 3, description: "AI-powered pre-build planning assistant for developers. Generates structured documentation bundles.", updatedAt: "2 hours ago" },
  { id: "4", name: "Launchpad Landing", type: "landing_page", status: "in_progress", domainsCompleted: 5, description: "Marketing site and waitlist for an upcoming SaaS product launch.", updatedAt: "Yesterday" },
  { id: "2", name: "Internal Expense Tracker", type: "internal_tool", status: "complete", domainsCompleted: 10, description: "Internal tool for tracking team expenses and reimbursements. Supabase + Next.js.", updatedAt: "3 days ago" },
  { id: "3", name: "Pulse API", type: "api", status: "complete", domainsCompleted: 10, description: "REST API for real-time analytics events. Rate-limited, JWT auth, Redis-backed.", updatedAt: "1 week ago" },
];
export const PROJECT_TYPE_BADGE_CLASS: Record<Project["type"], string> = {
  saas: "badge-blue", api: "badge-green", internal_tool: "badge-amber",
  mobile: "badge-purple", landing_page: "badge-orange", other: "badge-blue",
};
