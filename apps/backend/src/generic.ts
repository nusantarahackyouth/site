import { HonoBase } from "./app";

export const router = new HonoBase().get("/", (c) => {
  return c.json({
    message: "hackyouth.id is literally the same as nusantara hack youth, lmao",
  });
});
