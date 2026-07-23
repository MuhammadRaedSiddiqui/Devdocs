// apps/api/src/trpc/router.ts
// Main tRPC router - combines all sub-routers

import { router } from './trpc';
import { projectsRouter } from './routers/projects';

/**
 * Main application router
 * Add new routers here as you create them
 */
export const appRouter = router({
  projects: projectsRouter,
  // Add more routers here:
  // keys: keysRouter,
  // ai: aiRouter,
});

/**
 * Export type definition for frontend
 * This enables full type safety on the client
 */
export type AppRouter = typeof appRouter;
