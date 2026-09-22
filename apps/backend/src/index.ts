import { Scalar } from "@scalar/hono-api-reference";
import { openAPIRouteHandler } from "hono-openapi";

import { createHono } from "@/router/app";
import { router } from "@/router/routes";

const api = createHono().basePath("/api").route("/", router);

export const app = api
  .get("/openapi.json", (c, next) =>
    openAPIRouteHandler(router, {
      documentation: {
        info: {
          title: "Nusantara Hack Youth API",
          version: "1.0.0",
          description: "API for Nusantara Hack Youth services.",
        },
        servers: [{ url: c.env?.SERVER_API_URL ?? "/api" }],
      },
    })(c, next),
  )
  .get(
    "/docs",
    Scalar({
      pageTitle: "Nusantara Hack Youth API Reference",
      url: "/api/openapi.json",
    }),
  );

export type AppType = typeof app;
export type { RouterRoutes } from "./router/routes";

export { router };
export default app;
