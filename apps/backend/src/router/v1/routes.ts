import { createHono } from "@/router/app";
// import miscRouter from "./(misc)";
import eventsRouter from "./(events)";

export const router = createHono()
    .get("/", async (c) => {
        return c.json({
            success: true,
            message: "Welcome to Nusantara Hack Youth public API.",
            hint: "Go to /api/docs for more info on available endpoints."
        });
    })
    .route("/events", eventsRouter);
export type RouterRoutes = typeof router;
