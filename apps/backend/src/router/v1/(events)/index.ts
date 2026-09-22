import { createHono } from "@/router/app";
import { describeRoute, resolver } from "hono-openapi";
import * as z from "zod";

const eventSchema = z.object({
  name: z.string(),
  banner: z.string().nullable(),
  link: z.string().nullable(),
  started_at: z.iso.datetime(),
  ended_at: z.iso.datetime(),
  location: z.string(),
});

const eventsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(eventSchema),
});

const router = createHono().get(
  "/",
  describeRoute({
    tags: ["Events"],
    summary: "List events",
    responses: {
      200: {
        description: "A list of Nusantara Hack Youth current and past events.",
        content: {
          "application/json": {
            schema: resolver(eventsResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    return c.json({
      success: true,
      data: [
        {
          name: "Sunbeam Jakarta",
          banner: null,
          link: "https://sunbeam.hackclub.com/jakarta",
          started_at: new Date("2026-08-30T01:00:00.000Z"),
          ended_at: new Date("2026-08-30T13:00:00.000Z"),
          location: "Jakarta, Indonesia",
        },
        {
          name: "Campfire Jakarta",
          banner: null,
          link: "https://campfire.hackclub.com/jakarta",
          started_at: new Date("2026-02-28T02:00:00.000Z"),
          ended_at: new Date("2026-03-01T10:00:00.000Z"),
          location: "Jakarta, Indonesia",
        },
        {
          name: "Campfire Solo",
          banner: null,
          link: "https://campfire.hackclub.com/solo",
          started_at: new Date("2026-02-28T01:00:00.000Z"),
          ended_at: new Date("2026-03-01T10:00:00.000Z"),
          location: "Solo, Indonesia",
        },
        {
          name: "Campfire Malang",
          banner: null,
          link: "https://campfire.hackclub.com/malang",
          started_at: new Date("2026-02-28T00:45:00.000Z"),
          ended_at: new Date("2026-02-28T14:00:00.000Z"),
          location: "Malang, Indonesia",
        },
        {
          name: "Campfire Medan",
          banner: null,
          link: "https://campfire.hackclub.com/medan",
          started_at: new Date("2026-02-28T00:00:00.000Z"),
          ended_at: new Date("2026-03-01T10:00:00.000Z"),
          location: "Medan, Indonesia",
        },
        {
          name: "Daydream Jakarta",
          banner: null,
          link: "https://daydream.hackclub.com/jakarta",
          started_at: new Date("2025-09-27T00:30:00.000Z"),
          ended_at: new Date("2025-09-28T12:30:00.000Z"),
          location: "Jakarta, Indonesia",
        },
      ],
    });
  },
);

export default router;
