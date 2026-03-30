import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { refreshSession } from "@/features/auth/api";
import { hasSessionHint, useAuthStore } from "@/features/auth/auth.store";
import { FullScreenLoader } from "@/shared/ui/FullScreenLoader";

export const AuthBootstrap = ({ children }: PropsWithChildren) => {
  const status = useAuthStore((state) => state.status);
  const setHydrating = useAuthStore((state) => state.setHydrating);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (status !== "idle") {
      return;
    }

    const shouldAttemptRefresh =
      hasSessionHint() || window.location.pathname.startsWith("/app");

    if (!shouldAttemptRefresh) {
      clearSession();
      return;
    }

    setHydrating();

    refreshSession()
      .then((response) => {
        setSession(response);
      })
      .catch(() => {
        clearSession();
      });
  }, [clearSession, setHydrating, setSession, status]);

  if (status === "idle" || status === "hydrating") {
    return <FullScreenLoader label="Restoring session" />;
  }

  return children;
};
