import { HonoBase } from "../../app";

export const router = new HonoBase().get("/", (c) => {
  return c.json({ ok: true });
});
