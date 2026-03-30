import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { queryClient } from "@/app/query-client";
import { AuthBootstrap } from "@/features/auth/components/AuthBootstrap";
import { SocketBootstrap } from "@/shared/socket/SocketBootstrap";
import { useThemeEffect } from "@/shared/hooks/useThemeEffect";
import { env } from "@/shared/utils/env";

export const AppProviders = ({ children }: PropsWithChildren) => {
  useThemeEffect();

  useEffect(() => {
    queryClient.resumePausedMutations().catch(() => undefined);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <SocketBootstrap>{children}</SocketBootstrap>
      </AuthBootstrap>
      {env.enableQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
};
