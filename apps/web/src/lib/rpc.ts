import type { RouterRoutes } from "@nhy/backend";
import { hc } from "hono/client";

export const rpc = hc<RouterRoutes>(import.meta.env.PUBLIC_API_URL ?? "/api");
