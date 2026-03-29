export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || "").replace(/\/$/, "");

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);

const buildUrl = (path) => {
  if (isAbsoluteUrl(path) || !API_BASE_URL) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!isAbsoluteUrl(API_BASE_URL)) {
    const normalizedBase = API_BASE_URL.startsWith("/") ? API_BASE_URL : `/${API_BASE_URL}`;

    if (normalizedPath === normalizedBase || normalizedPath.startsWith(`${normalizedBase}/`)) {
      return normalizedPath;
    }

    return `${normalizedBase}${normalizedPath}`;
  }

  return `${API_BASE_URL}${normalizedPath}`;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return {
      success: response.ok,
      data: text,
      message: text,
    };
  }

  return response.json();
};

export const createApiClient = ({ getAccessToken, setAccessToken, onUnauthorized }) => {
  const refresh = async () => {
    const response = await fetch(buildUrl("/api/auth/refresh"), {
      method: "POST",
      credentials: "include",
    });

    const payload = await parseResponse(response);
    if (!response.ok || payload?.success === false || !payload?.data?.accessToken) {
      return null;
    }

    setAccessToken(payload.data.accessToken);
    return payload.data.accessToken;
  };

  const request = async (path, options = {}, retry = true) => {
    const headers = new Headers(options.headers || {});
    const body = options.body;
    const token = getAccessToken();

    if (!(body instanceof FormData) && body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(buildUrl(path), {
      ...options,
      headers,
      credentials: "include",
    });

    if (response.status === 401 && retry) {
      const nextToken = await refresh();

      if (nextToken) {
        return request(
          path,
          {
            ...options,
            headers: Object.fromEntries(headers.entries()),
          },
          false
        );
      }

      setAccessToken("");
      onUnauthorized?.();
    }

    const payload = await parseResponse(response);

    if (!response.ok || payload?.success === false) {
      const error = new Error(
        payload?.message ||
          payload?.error ||
          (typeof payload?.data === "string" ? payload.data : "") ||
          `Request failed (${response.status})`
      );
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    if (payload && typeof payload === "object" && "data" in payload) {
      return payload.data;
    }

    return payload;
  };

  return request;
};
