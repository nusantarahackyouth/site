/// <reference types="astro/client" />

declare global {
  interface Window {
    posthog?: {
      capture(event: string, properties?: Record<string, unknown>): void;
      logger?: {
        info(message: string, properties?: Record<string, unknown>): void;
      };
    };
  }
}

export {};
