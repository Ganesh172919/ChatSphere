import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/auth.store";
import { FullScreenLoader } from "@/shared/ui/FullScreenLoader";

interface AuthGateProps extends PropsWithChildren {
  requireAuth: boolean;
  redirectTo?: string;
}

export const AuthGate = ({ children, requireAuth, redirectTo = "/login" }: AuthGateProps) => {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);
  const setPostAuthRedirect = useAuthStore((state) => state.setPostAuthRedirect);

  useEffect(() => {
    if (requireAuth && status !== "authenticated") {
      setPostAuthRedirect(`${location.pathname}${location.search}${location.hash}`);
    }
  }, [location.hash, location.pathname, location.search, requireAuth, setPostAuthRedirect, status]);

  if (status === "idle" || status === "hydrating") {
    return <FullScreenLoader label="Checking access" />;
  }

  if (requireAuth && status !== "authenticated") {
    return <Navigate to={redirectTo} replace />;
  }

  if (!requireAuth && status === "authenticated") {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};
