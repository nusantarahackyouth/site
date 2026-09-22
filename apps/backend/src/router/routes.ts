import { createHono } from "@/router/app";
import { router as v1Router } from "@/router/v1/routes";
import type { Hono } from "hono";

export const router = createHono()
  .get("/", (c) =>
    c.json({
      success: true,
      message: "Welcome to Nusantara Hack Youth public API.",
      hint: "Go to /api/docs or /api/openapi.json for more info on available endpoints.",
    }),
  )
  .notFound((c) =>
    c.json(
      {
        success: false,
        message: "Route not found.",
        hint: "Go to /api/docs or /api/openapi.json for more info on available endpoints.",
      },
      404,
    ),
  )
  .onError((err, c) => {
    // TODO: Log error
    return c.json(
      {
        success: false,
        message: "Internal server error.",
      },
      500,
    );
  })
  .route("/v1", v1Router);

export type RouterRoutes = typeof router;
