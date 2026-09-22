import { createHono } from "@/router/app";
import { router as v1Router } from "@/router/v1/routes";
import type { Hono } from "hono";


export const router = createHono()
  .get("/", (c) => {
    return c.json({
      message: "hackyouth.id is literally the same as nusantara hack youth, lmao",
    });
  })
  .route("/v1", v1Router);

export type RouterRoutes = typeof router;