import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeGoogleCode } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth.store";
import { AuthFrame } from "@/features/auth/components/AuthFrame";
import { Button } from "@/shared/ui/Button";

const GoogleOauthPage = () => {
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const code = query.get("code");
  const setSession = useAuthStore((state) => state.setSession);
  const redirectTo = useAuthStore((state) => state.postAuthRedirect);
  const setPostAuthRedirect = useAuthStore((state) => state.setPostAuthRedirect);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError("No exchange code was returned by the backend.");
      return;
    }

    exchangeGoogleCode(code)
      .then((response) => {
        setSession(response);
        const next = redirectTo ?? "/app/ai";
        setPostAuthRedirect(null);
        navigate(next, { replace: true });
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : "Google sign-in failed");
      });
  }, [code, navigate, redirectTo, setPostAuthRedirect, setSession]);

  return (
    <AuthFrame
      title="Completing Google sign-in"
      description="We’re exchanging the backend callback code and restoring your session."
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Hold tight while ChatSphere finishes the backend exchange and restores your access token.
        </p>
        {error ? (
          <div className="space-y-3 rounded-2xl border border-danger-500/30 bg-danger-500/10 p-4 text-sm text-danger-500">
            <p>{error}</p>
            <Button type="button" variant="secondary" onClick={() => window.location.assign("/login")}>
              Return to sign in
            </Button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-surface-3 px-4 py-3 text-sm text-text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-r-transparent" />
            Finalizing your session
          </div>
        )}
      </div>
    </AuthFrame>
  );
};

export default GoogleOauthPage;
