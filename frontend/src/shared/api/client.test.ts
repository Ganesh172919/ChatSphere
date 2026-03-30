import { beforeEach, describe, expect, it, vi } from "vitest";
import { rawRequest } from "@/shared/api/client";
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

describe("api client refresh flow", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useAuthStore.setState({
      accessToken: "stale-token",
      user: mockUser,
      status: "authenticated",
      postAuthRedirect: null,
    });
  });

  it("refreshes once on 401 and retries the original request", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Expired access token",
            },
          }),
          { status: 401 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "fresh-token",
              user: mockUser,
            },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              ok: true,
            },
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await rawRequest<{ ok: boolean }>("/api/protected", {
      method: "GET",
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(useAuthStore.getState().accessToken).toBe("fresh-token");

    const [firstCall, refreshCall, retryCall] = fetchMock.mock.calls;
    expect(firstCall?.[0]).toContain("/api/protected");
    expect(refreshCall?.[0]).toContain("/api/auth/refresh");
    expect(retryCall?.[0]).toContain("/api/protected");
    expect(new Headers(retryCall?.[1]?.headers).get("Authorization")).toBe("Bearer fresh-token");
  });
});
