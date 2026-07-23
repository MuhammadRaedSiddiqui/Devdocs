// apps/api/src/middleware/hono-clerk-auth.ts
// Clerk authentication middleware for Hono
import { createMiddleware } from 'hono/factory';
import { clerkClient, verifyToken } from '@clerk/express';
import { logger } from '../lib/logger';
import { getOrCreateUser } from '../lib/db';

// Type augmentation for Hono context
declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
    clerkUserId: string;
  }
}

/**
 * Hono middleware for Clerk authentication
 * Validates Bearer token and sets user context in Hono's context
 */
export const requireClerkAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({ path: c.req.path }, 'Missing or invalid authorization header');
    return c.json({ error: 'unauthorized', message: 'Sign in to continue.' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');

  // ── Test-mode bypass ────────────────────────────────────────────────────────
  // Integration tests can't mint real Clerk sessions, so in the test
  // environment we accept a `test_clerk_token_<localUserId>` token paired with
  // an `x-test-user-id` header. This branch is unreachable outside NODE_ENV=test.
  if (process.env.NODE_ENV === 'test' && token.startsWith('test_clerk_token_')) {
    const testUserId = c.req.header('x-test-user-id') ?? token.replace('test_clerk_token_', '');
    if (!testUserId) {
      return c.json({ error: 'unauthorized', message: 'Session invalid or expired.' }, 401);
    }
    c.set('clerkUserId', `clerk_${testUserId}`);
    c.set('userId', testUserId);
    c.set('userEmail', 'test@example.com');
    await next();
    return;
  }

  try {
    // Verify token with Clerk
    const sessionClaims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      authorizedParties: process.env.WEB_URL ? [process.env.WEB_URL] : undefined,
    });

    if (!sessionClaims || !sessionClaims.sub) {
      logger.warn({ path: c.req.path }, 'Invalid session token');
      return c.json({ error: 'unauthorized', message: 'Session invalid or expired.' }, 401);
    }

    // Get user info from Clerk
    const user = await clerkClient.users.getUser(sessionClaims.sub);

    if (!user) {
      logger.warn({ clerkUserId: sessionClaims.sub }, 'User not found in Clerk');
      return c.json({ error: 'unauthorized', message: 'User not found.' }, 401);
    }

    const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
    if (!email) {
      logger.warn({ clerkUserId: user.id }, 'Clerk user has no email address');
      return c.json({ error: 'invalid_user', message: 'Your account needs a verified email address.' }, 400);
    }

    const localUserId = await getOrCreateUser({
      clerkId: user.id,
      email,
      displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username,
      avatarUrl: user.imageUrl,
    });

    // Set the local UUID for database queries and retain the Clerk ID
    // separately for observability and external integrations.
    c.set('clerkUserId', user.id);
    c.set('userId', localUserId);
    c.set('userEmail', email);

    logger.debug({ userId: user.id, email: c.get('userEmail') }, 'User authenticated (Hono)');

    await next();
  } catch (err) {
    logger.error({ err, path: c.req.path }, 'Clerk auth verification failed (Hono)');
    return c.json({ error: 'unauthorized', message: 'Authentication failed.' }, 401);
  }
});
