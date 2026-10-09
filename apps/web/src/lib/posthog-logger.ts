type LogProperties = Record<string, unknown>;

export const posthogLogger = {
  info(message: string, properties?: LogProperties) {
    window.posthog?.logger?.info(message, properties);
  },
};
