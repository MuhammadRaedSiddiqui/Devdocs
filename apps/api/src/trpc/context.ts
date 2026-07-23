// apps/api/src/trpc/context.ts
// tRPC context - provides authentication and request context to procedures

import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { clerkClient, verifyToken } from '@clerk/express';
import { logger } from '../lib/logger';
import { getOrCreateUser } from '../lib/db';

/**
 * Creates context for each tRPC request
 * Validates Clerk session and provides user info
 */
export async function createContext(opts: FetchCreateContextFnOptions) {
  const authHeader = opts.req.headers.get('Authorization');

  // No auth header - return null user context
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: null, userEmail: null };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // Verify token with Clerk
    const sessionClaims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      authorizedParties: process.env.WEB_URL ? [process.env.WEB_URL] : undefined,
    });

    if (!sessionClaims || !sessionClaims.sub) {
      return { userId: null, userEmail: null };
    }

    // Get user info
    const user = await clerkClient.users.getUser(sessionClaims.sub);

    if (!user) {
      return { userId: null, userEmail: null };
    }

    const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
    if (!email) {
      logger.warn({ clerkUserId: user.id }, 'Clerk user has no email address');
      return { userId: null, userEmail: null };
    }

    const localUserId = await getOrCreateUser({
      clerkId: user.id,
      email,
      displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username,
      avatarUrl: user.imageUrl,
    });

    logger.debug({ userId: localUserId, clerkUserId: user.id }, 'tRPC context created with user');

    return {
      userId: localUserId,
      userEmail: email,
    };
  } catch (err) {
    logger.error({ err }, 'Failed to create tRPC context');
    return { userId: null, userEmail: null };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
