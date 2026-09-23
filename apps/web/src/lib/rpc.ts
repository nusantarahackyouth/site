import type { RouterRoutes } from "@nhy/backend";
import { env } from "cloudflare:workers";
import { hc } from "hono/client";

export const getRPCClient = () =>
  hc<RouterRoutes>(import.meta.env.PUBLIC_API_URL ?? "/api");

type ApiBinding = {
  fetch: typeof globalThis.fetch;
};

export function getRPCServer() {
  const binding = (env as { API?: ApiBinding }).API;

  const serverApiUrl = import.meta.env.SERVER_API_URL;
  if (!serverApiUrl) {
    throw new Error(
      "SERVER_API_URL is required when the API service binding is unavailable.",
    );
  }

  // Use binding so backend request can be done more efficient
  if (binding && !import.meta.env.DEV) {
    return hc<RouterRoutes>(serverApiUrl, {
      fetch: binding.fetch.bind(binding),
    });
  }

  return hc<RouterRoutes>(serverApiUrl);
}
