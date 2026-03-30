import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/auth.store";
import { disconnectSocket, ensureSocketConnection } from "@/shared/socket/socket-client";

export const SocketBootstrap = ({ children }: PropsWithChildren) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === "authenticated" && accessToken) {
      ensureSocketConnection(accessToken);
      return;
    }

    disconnectSocket();
  }, [accessToken, status]);

  return children;
};
