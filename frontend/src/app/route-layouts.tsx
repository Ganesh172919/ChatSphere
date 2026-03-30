import { Outlet, useLocation } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { AuthGate } from "@/features/auth/components/AuthGate";

export const PublicLayout = () => {
  const location = useLocation();

  return (
    <AuthGate requireAuth={false} redirectTo="/app/ai" key={location.pathname}>
      <Outlet />
    </AuthGate>
  );
};

export const ProtectedLayout = () => {
  return (
    <AuthGate requireAuth>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthGate>
  );
};
