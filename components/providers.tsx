"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "@/lib/stack-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry on 401/403 auth errors
              if (error instanceof Error && (
                error.message.includes("401") || 
                error.message.includes("403") ||
                error.message.includes("Not authenticated")
              )) {
                return false;
              }
              // Retry up to 2 times for other errors
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: false, // Don't retry mutations
          },
        },
      })
  );

  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <AuthProvider>
              {children}
              <Toaster
            position="bottom-right"
            duration={7000}
            richColors
            closeButton
            expand={false}
            visibleToasts={5}
            gap={12}
            toastOptions={{
              className: "font-sans",
              style: {
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              },
            }}
          />
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </StackTheme>
    </StackProvider>
  );
}
