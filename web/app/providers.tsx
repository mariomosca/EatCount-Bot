'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          classNames: {
            toast: 'bg-slate-900 border border-slate-700 text-white',
            description: 'text-slate-400',
            error: 'bg-red-950 border-red-800 text-red-200',
          },
        }}
        richColors
      />
    </QueryClientProvider>
  );
}
