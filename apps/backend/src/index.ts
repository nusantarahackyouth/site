import { Hono } from "hono";
import astroEntry from "@nhy/web/server/entry.mjs";

const app = new Hono();

app.all("*", (c) => {
  const env = {
    ...(c.env ?? {}),
    // Prevents crash when c.env.ASSETS is undefined in dev mode
    ASSETS: (c.env as Record<string, unknown> | undefined)?.ASSETS ?? {
      fetch: () => Promise.resolve(new Response(null, { status: 404 })),
    },
  };

  return astroEntry.fetch(c.req.raw, env, c.executionCtx);
});

export default app;
