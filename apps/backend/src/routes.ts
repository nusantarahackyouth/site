import { HonoBase } from "./app";
import { router as v1Router } from "./v1/routes";

export const router = new HonoBase()
  .get("/", (c) => {
    return c.json({
      message: "hackyouth.id is literally the same as nusantara hack youth, lmao",
    });
  })
  .route("/v1", v1Router);
export type RouterRoutes = typeof router;
