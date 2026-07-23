// apps/api/src/test/helpers.ts
// Test helpers for Clerk-based authentication
import { eq } from 'drizzle-orm';
import { db, users } from '../lib/db';

type TestUser = {
  id: string;
  clerkId: string;
  email: string;
};

/**
 * Creates a test user in the database with a Clerk ID
 */
export async function createTestUser(email = 'test@example.com'): Promise<TestUser> {
  const clerkId = `user_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const [user] = await db.insert(users).values({
    clerkId,
    email,
    displayName: 'Test User',
  }).returning();
  return { id: user.id, clerkId, email };
}

/**
 * Creates a mock Clerk session token for testing
 * In real tests, use Clerk's test mode tokens
 */
export function createTestClerkToken(userId: string): string {
  // In production tests, use Clerk's createClerkClient with test mode
  // For now, return a mock token that test middleware can recognize
  return `test_clerk_token_${userId}`;
}

/**
 * Gets authentication headers for testing protected routes
 * Uses Clerk's authorization header format
 */
export async function getAuthHeaders(userId?: string): Promise<Record<string, string>> {
  const user = userId ? { id: userId } : await createTestUser();
  const token = createTestClerkToken(user.id);
  return {
    Authorization: `Bearer ${token}`,
    'x-test-user-id': user.id, // Middleware can use this in test mode
  };
}

/**
 * Cleans up test data for a specific user
 * Cascade deletes will handle projects, keys, and documentation
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, userId));
}
