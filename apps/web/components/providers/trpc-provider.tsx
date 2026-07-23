// apps/web/components/providers/trpc-provider.tsx
'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { trpc, makeTRPCClient } from '@/lib/trpc';

/**
 * tRPC Provider with Clerk authentication
 * Wraps the app to enable tRPC hooks with automatic auth
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  // Create clients once
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000, // 5 seconds
        refetchOnWindowFocus: false,
      },
    },
  }));

  const [trpcClient] = useState(() =>
    makeTRPCClient(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
