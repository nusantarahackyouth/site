import { createHono } from "@/router/app";
// import miscRouter from "./(misc)";
import eventsRouter from "./(events)";

export const router = createHono()
    .route("/events", eventsRouter);
export type RouterRoutes = typeof router;
