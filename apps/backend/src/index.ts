import { HonoBase } from "./app";
import { router } from "./routes";

export const app = new HonoBase().basePath("/api");
export type AppType = typeof app;
export type { RouterRoutes } from "./routes";

app.route("/", router);

export { router };
export default app;
