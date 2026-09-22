/* eslint-disable */
// Created manually, since default cloudflare runtime types broke astro own typing
// 
interface __BaseEnv_Env {
	ASSETS: Fetcher;
	PUBLIC_API_URL: string;
	SERVER_API_URL: string;
	API: Fetcher /* nhy-site-be */;
}
declare namespace Cloudflare {
	interface Env extends __BaseEnv_Env {}
}
interface Env extends __BaseEnv_Env {}
type StringifyValues<EnvType extends Record<string, unknown>> = {
	[Binding in keyof EnvType]: EnvType[Binding] extends string ? EnvType[Binding] : string;
};
declare namespace NodeJS {
	interface ProcessEnv extends StringifyValues<Pick<Cloudflare.Env, "PUBLIC_API_URL" | "SERVER_API_URL">> {}
}
type Fetcher = {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
	connect(address: SocketAddress | string, options?: SocketOptions): Socket;
};

declare module "cloudflare:workers" {
	export const env: Cloudflare.Env;
}
