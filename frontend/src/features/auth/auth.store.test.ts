import { describe, expect, it, beforeEach } from "vitest";
import { useAuthStore } from "@/features/auth/auth.store";

const mockUser = {
  id: "user-1",
  username: "captain",
  email: "captain@example.com",
  avatar: null,
  displayName: "Captain",
  bio: null,
  authProvider: "LOCAL" as const,
  onlineStatus: true,
  lastSeen: new Date().toISOString(),
  settings: {
    theme: "system" as const,
    accentColor: "teal",
    notifications: {
      email: true,
      push: true,
      mentions: true,
    },
    aiFeatures: {
      smartReplies: true,
      sentiment: true,
      grammar: true,
    },
  },
  isAdmin: false,
  createdAt: new Date().toISOString(),
};

describe("auth store", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useAuthStore.setState({
      accessToken: null,
      user: null,
      status: "idle",
      postAuthRedirect: null,
    });
  });

  it("hydrates and clears session metadata", () => {
    useAuthStore.getState().setHydrating();
    expect(useAuthStore.getState().status).toBe("hydrating");

    useAuthStore.getState().setSession({
      accessToken: "token-123",
      user: mockUser,
    });

    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().accessToken).toBe("token-123");
    expect(useAuthStore.getState().user?.email).toBe(mockUser.email);
    expect(window.sessionStorage.getItem("chatsphere.session")).toBe("1");

    useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().status).toBe("guest");
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(window.sessionStorage.getItem("chatsphere.session")).toBeNull();
  });

  it("updates the active user without dropping authentication", () => {
    useAuthStore.getState().setSession({
      accessToken: "token-123",
      user: mockUser,
    });

    useAuthStore.getState().updateUser({
      ...mockUser,
      displayName: "Updated Captain",
    });

    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().user?.displayName).toBe("Updated Captain");
  });
});
