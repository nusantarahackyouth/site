import { createHono } from "@/router/app";
import { describeRoute, resolver } from "hono-openapi";
import * as z from "zod";

const eventStatusSchema = z.enum(["upcoming", "started", "ended", "cancelled"]);

const eventSchema = z.object({
  name: z.string(),
  banner: z.string().nullable(),
  status: eventStatusSchema,
  link: z.string().nullable(),
  started_at: z.iso.datetime().nullable(),
  ended_at: z.iso.datetime().nullable(),
  location: z.string(),
});

type EventStatus = z.infer<typeof eventStatusSchema>;
type EventSource = {
  name: string;
  banner: string | null;
  link: string | null;
  started_at: Date | null;
  ended_at: Date | null;
  location: string;
  is_cancelled: boolean;
};

const events: EventSource[] = [
  {
    name: "Haven Jakarta",
    banner: null,
    link: "https://haven.hackclub.com/jakarta",
    started_at: null,
    ended_at: null,
    location: "Jakarta, Indonesia",
    is_cancelled: false,
  },
  {
    name: "Haven Bandung",
    banner: null,
    link: "https://haven.hackclub.com/bandung",
    started_at: null,
    ended_at: null,
    location: "Bandung, Indonesia",
    is_cancelled: false,
  },
  {
    name: "Haven Medan",
    banner: null,
    link: "https://haven.hackclub.com/medan",
    started_at: null,
    ended_at: null,
    location: "Medan, Indonesia",
    is_cancelled: false,
  },
  {
    name: "Sunbeam Jakarta",
    banner: null,
    link: "https://sunbeam.hackclub.com/jakarta",
    started_at: new Date("2026-08-30T01:00:00.000Z"),
    ended_at: new Date("2026-08-30T13:00:00.000Z"),
    location: "Jakarta, Indonesia",
    is_cancelled: false,
  },
  {
    name: "Campfire Jakarta",
    banner: null,
    link: "https://campfire.hackclub.com/jakarta",
    started_at: new Date("2026-02-28T02:00:00.000Z"),
    ended_at: new Date("2026-03-01T10:00:00.000Z"),
    location: "Jakarta, Indonesia",
    is_cancelled: false,
  },
  {
    name: "Campfire Bandung",
    banner: null,
    link: "https://campfire.hackclub.com/bandung",
    started_at: new Date("2026-02-28T01:00:00.000Z"),
    ended_at: new Date("2026-02-28T13:00:00.000Z"),
    location: "Bandung, Indonesia",
    is_cancelled: true,
  },
  {
    name: "Campfire Solo",
    banner: null,
    link: "https://campfire.hackclub.com/solo",
    started_at: new Date("2026-02-28T01:00:00.000Z"),
    ended_at: new Date("2026-03-01T10:00:00.000Z"),
    location: "Solo, Indonesia",
    is_cancelled: false,
  },
  {
    name: "Campfire Malang",
    banner: null,
    link: "https://campfire.hackclub.com/malang",
    started_at: new Date("2026-02-28T00:45:00.000Z"),
    ended_at: new Date("2026-02-28T14:00:00.000Z"),
    location: "Malang, Indonesia",
    is_cancelled: false,
  },
  {
    name: "Campfire Medan",
    banner: null,
    link: "https://campfire.hackclub.com/medan",
    started_at: new Date("2026-02-28T00:00:00.000Z"),
    ended_at: new Date("2026-03-01T10:00:00.000Z"),
    location: "Medan, Indonesia",
    is_cancelled: false,
  },
  {
    name: "Daydream Jakarta",
    banner: null,
    link: "https://daydream.hackclub.com/jakarta",
    started_at: new Date("2025-09-27T00:30:00.000Z"),
    ended_at: new Date("2025-09-28T12:30:00.000Z"),
    location: "Jakarta, Indonesia",
    is_cancelled: false,
  },
];

function serializeEvent(event: EventSource, now: Date) {
  const { is_cancelled, ...details } = event;
  let status: EventStatus;

  if (is_cancelled) status = "cancelled";
  else if (!event.started_at || (event.ended_at && now < event.started_at))
    status = "upcoming";
  else if (!event.ended_at || now < event.ended_at) status = "started";
  else status = "ended";

  return { ...details, status };
}

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
    const now = new Date();

    return c.json({
      success: true,
      data: events.map((event) => serializeEvent(event, now)),
    });
  },
);

export default router;
