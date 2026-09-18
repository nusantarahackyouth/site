import type { langs } from ".";

export type Languages = Record<(typeof langs)[number], LanguageKeys>;
export type LanguageKeys = Record<`${string}.${string}`, string>;
