import { HonoBase } from "./app";
import { router as genericRouter } from "./generic";
import { router as v1Router } from "./v1/routes";

export const router = new HonoBase()
  .route("/", genericRouter)
  .route("/v1", v1Router);
export type RouterRoutes = typeof router;
