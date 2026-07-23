// apps/api/src/trpc/trpc.ts
// tRPC initialization - defines base router and procedures

import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import { logger } from '../lib/logger';

// Initialize tRPC with context
const t = initTRPC.context<Context>().create();

/**
 * Export reusable router and procedure builders
 */
export const router = t.router;
export const middleware = t.middleware;

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 * Throws UNAUTHORIZED if user is not authenticated
 */
export const protectedProcedure = t.procedure.use(
  middleware(async ({ ctx, next }) => {
    if (!ctx.userId) {
      logger.warn('Unauthorized tRPC request');
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Sign in to continue.',
      });
    }

    // Return new context with non-null userId
    return next({
      ctx: {
        userId: ctx.userId,
        userEmail: ctx.userEmail,
      },
    });
  })
);
