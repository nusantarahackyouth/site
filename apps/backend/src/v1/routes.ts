import { HonoBase } from "../app";
import { router as miscRouter } from "./(misc)";

export const router = new HonoBase().route("/", miscRouter);
export type RouterRoutes = typeof router;
