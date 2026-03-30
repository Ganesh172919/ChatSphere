import { create } from "zustand";
import type { AuthUser } from "@/shared/types/contracts";

export type AuthStatus = "idle" | "hydrating" | "authenticated" | "guest";
const sessionHintKey = "chatsphere.session";

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  postAuthRedirect: string | null;
  setHydrating: () => void;
  setSession: (payload: { accessToken: string; user: AuthUser }) => void;
  clearSession: () => void;
  updateUser: (user: AuthUser) => void;
  setPostAuthRedirect: (redirectTo: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "idle",
  postAuthRedirect: null,
  setHydrating: () => set({ status: "hydrating" }),
  setSession: ({ accessToken, user }) =>
    set(() => {
      window.sessionStorage.setItem(sessionHintKey, "1");
      return {
        accessToken,
        user,
        status: "authenticated",
      };
    }),
  clearSession: () =>
    set(() => {
      window.sessionStorage.removeItem(sessionHintKey);
      return {
        accessToken: null,
        user: null,
        status: "guest",
      };
    }),
  updateUser: (user) =>
    set((state) => ({
      ...state,
      user,
      status: "authenticated",
    })),
  setPostAuthRedirect: (redirectTo) => set({ postAuthRedirect: redirectTo }),
}));

export const hasSessionHint = () => window.sessionStorage.getItem(sessionHintKey) === "1";
