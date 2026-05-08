"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { useSiteConfigStore } from "@/store/site-config.store";
import { useAuthStore } from "@/store/auth.store";
import { useMe } from "@/services/auth.service";
import type { SiteConfigValue } from "@/types/site-config";

function AuthSyncer() {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const { data, isPending } = useMe();

  useEffect(() => {
    if (isPending) return;
    // Sync auth store với session từ cookie
    const user = (data as import("@/types/auth").AuthUser | null | undefined) ?? null;
    setUser(user);
    setHydrated(true);
  }, [data, isPending, setUser, setHydrated]);

  return null;
}

interface ProvidersProps {
  children: ReactNode;
  initialSiteConfig: SiteConfigValue;
}

export function Providers({ children, initialSiteConfig }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            gcTime: 0,
            retry: 1,
            refetchOnMount: "always",
            refetchOnWindowFocus: true,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  const setConfig = useSiteConfigStore((s) => s.setConfig);

  // Hydrate site config từ server vào store khi mount
  useEffect(() => {
    setConfig(initialSiteConfig);
  }, [initialSiteConfig, setConfig]);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthSyncer />
        {children}
        <Toaster position="top-right" richColors closeButton />
        {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
