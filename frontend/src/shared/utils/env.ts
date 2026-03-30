export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  socketUrl: import.meta.env.VITE_SOCKET_URL || "http://localhost:3000",
  enableQueryDevtools: import.meta.env.DEV && import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === "true",
};
