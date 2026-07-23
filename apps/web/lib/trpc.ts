// apps/web/lib/trpc.ts
// tRPC client configuration - enables type-safe API calls

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@devdocs/api/trpc';

/**
 * Create tRPC React hooks
 * These hooks are fully typed based on your API routes
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Get auth token for tRPC requests
 * This will be called by the client's headers function
 */
async function getAuthToken() {
  // In browser context, get token from Clerk
  if (typeof window !== 'undefined') {
    try {
      // Dynamically import to avoid SSR issues
      const { useAuth } = await import('@clerk/nextjs');
      // Note: This is a simplified version - in production you'd need
      // to handle this through context or a custom hook
      return null; // We'll handle this in the provider
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Create tRPC client with auth headers
 */
export function makeTRPCClient(getToken: () => Promise<string | null>) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/trpc`,

        // Automatically include auth token in requests
        async headers() {
          const token = await getToken();
          return {
            authorization: token ? `Bearer ${token}` : '',
          };
        },
      }),
    ],
  });
}
