import { createHono } from "@/router/app";
import { describeRoute, resolver } from "hono-openapi";
import * as z from "zod";

const eventSchema = z.object({
  name: z.string(),
  banner: z.string(),
  started_at: z.iso.datetime(),
  ended_at: z.iso.datetime(),
  description: z.string(),
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
        description: "A list of Nusantara Hack Youth events.",
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
          banner: "",
          started_at: new Date("2026-08-30 08:00:00"),
          ended_at: new Date("2026-08-31 17:00:00"),
          description: "Lorem itsumo color do si amit azizam.",
        },
        {
          name: "CF23",
          banner: "https://aaaaaaaa.httpnotfounderror.lul/",
          started_at: new Date("2026-10-31 09:00:00"),
          ended_at: new Date("2026-11-01 09:00:00"),
          description: "Yang bikin endpoint nyawit", // this is a joke. ignore
        },
      ],
    });
  },
);

export default router;
