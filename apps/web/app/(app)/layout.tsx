// app/(app)/layout.tsx
// Layout for all authenticated routes: /dashboard, /project/*, /settings, /docs
// Authentication is handled by Clerk middleware (middleware.ts) which automatically
// redirects unauthenticated users to /sign-in
// This layout passes children through. You can add:
//   1. A global query client provider (TanStack Query) — see PROMPT_MIGRATION.md Phase 6
//   2. Global toast provider — see CLAUDE_CODE_PROMPTS.md Prompt 11

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
