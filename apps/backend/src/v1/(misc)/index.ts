// import * as z from "zod";
// import { zValidator } from "@hono/zod-validator";
import { HonoBase } from "../../app";

export const router = new HonoBase().get("/", (c) => {
  return c.json({ ok: true });
});
