import { Hono } from "hono";
import type { HonoOptions } from "hono/hono-base";
import type { Schema, Env } from "hono/types";

export type BackendEnv = {
  //  Bindings: AuthType;
  //  Variables: AuthType & {
  //    account: typeof account.$inferSelect & {
  //      session: AuthType["session"];
  //    };
  //  };
};

export class HonoBase<CustomSchema extends Schema = Schema> extends Hono<
  BackendEnv,
  CustomSchema
> {
  constructor(params?: HonoOptions<BackendEnv>) {
    super(params);
  }
}
