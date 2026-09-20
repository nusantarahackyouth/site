import en from "./translations/ui/en";
import id from "./translations/ui/id";

export const locales = ["en", "id"] as const;
export const defaultLocale: Locale = "en";
export type Locale = (typeof locales)[number];

type TranslationValue = string | readonly string[];
type TranslationShape<T> = {
  [Key in keyof T]: T[Key] extends readonly string[]
    ? readonly string[]
    : string;
};

type EnglishTranslations = typeof en;
export type TranslationKey = keyof EnglishTranslations;
export type StringTranslationKey = {
  [Key in TranslationKey]: EnglishTranslations[Key] extends string
    ? Key
    : never;
}[TranslationKey];
export type ArrayTranslationKey = {
  [Key in TranslationKey]: EnglishTranslations[Key] extends readonly string[]
    ? Key
    : never;
}[TranslationKey];

const translations = {
  en,
  id,
} satisfies Record<Locale, TranslationShape<EnglishTranslations>>;

const COOKIE_NAME = "locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export interface LocaleHeaders {
  get(name: string): string | null;
}

export interface LocaleRequest {
  headers: LocaleHeaders;
}

export type LocaleSource = LocaleRequest | LocaleHeaders | string;

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && locales.some((locale) => locale === value)
  );
}

function localeFromCookie(cookie: string | null): Locale | undefined {
  if (!cookie) return undefined;

  for (const part of cookie.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name !== COOKIE_NAME) continue;

    const value = decodeURIComponent(valueParts.join("="));
    if (isLocale(value)) return value;
  }

  return undefined;
}

function localeFromLanguages(value: string | null): Locale | undefined {
  if (!value) return undefined;

  for (const item of value.split(",")) {
    const language = item.trim().split(";")[0]?.split("-")[0]?.toLowerCase();
    if (isLocale(language)) return language;
  }

  return undefined;
}

function isRequest(
  source: LocaleRequest | LocaleHeaders,
): source is LocaleRequest {
  return "headers" in source;
}

/**
 * Resolve a locale from an SSR request/headers, a header string, or the browser.
 * Pass the request explicitly during SSR to avoid shared global locale state.
 */
export function getLang(source?: LocaleSource): Locale {
  if (typeof source === "string") {
    return (
      (isLocale(source) ? source : undefined) ??
      localeFromCookie(source) ??
      localeFromLanguages(source) ??
      defaultLocale
    );
  }

  if (source) {
    const headers = isRequest(source) ? source.headers : source;
    return (
      localeFromCookie(headers.get("cookie")) ??
      localeFromLanguages(headers.get("accept-language")) ??
      defaultLocale
    );
  }

  if (typeof document === "undefined") return defaultLocale;

  return (
    localeFromCookie(document.cookie) ??
    localeFromLanguages(navigator.languages.join(",")) ??
    defaultLocale
  );
}

export function t(key: StringTranslationKey, lang?: Locale): string;
export function t(key: ArrayTranslationKey, lang?: Locale): string[];
export function t(
  key: TranslationKey,
  lang: Locale = getLang(),
): string | string[] {
  const localeTranslations = translations[lang] as Record<
    TranslationKey,
    TranslationValue
  >;
  const fallbackTranslations = translations[defaultLocale] as Record<
    TranslationKey,
    TranslationValue
  >;
  const value = localeTranslations[key] ?? fallbackTranslations[key];

  if (value === undefined) {
    throw new Error(`Missing translation for key "${key}"`);
  }
  if (typeof value === "string") return value;
  return [...value];
}

export interface Translator {
  (key: StringTranslationKey): string;
  (key: ArrayTranslationKey): string[];
}

export function createTranslator(lang: Locale): Translator {
  return ((key: TranslationKey) =>
    t(key as StringTranslationKey, lang)) as Translator;
}

export function swapTranslations(lang: Locale = getLang()): void {
  if (typeof document === "undefined") return;

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n") as TranslationKey | null;
    if (!key || !(key in translations[lang])) return;

    const value = (
      translations[lang] as Record<TranslationKey, TranslationValue>
    )[key];
    if (typeof value === "string") element.textContent = value;
  });
  document.documentElement.lang = lang;
}

export function subscribeLocale(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener("locale-change", listener);
  return () => window.removeEventListener("locale-change", listener);
}

export function setLang(lang: Locale): void {
  if (typeof document === "undefined") return;

  document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  swapTranslations(lang);
  window.dispatchEvent(new CustomEvent("locale-change", { detail: lang }));
}
