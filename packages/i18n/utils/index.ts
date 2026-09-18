import type { LanguageKeys, Languages } from "./types";

export const defaultLang = "en";
export const langs = ["en", "id"] as const;
type Lang = (typeof langs)[number];

export function getLangFromUrl(url: URL, keys: LanguageKeys) {
  const [, lang] = url.pathname.split("/");
  if (lang && lang in keys) return lang as keyof typeof keys;
  return defaultLang;
}

export function useTranslations(lang: Lang, keys: Languages) {
  const localizedUI: Record<string, string> = keys[lang];
  return function t(key: keyof (typeof keys)[typeof defaultLang]) {
    return key in localizedUI ? localizedUI[key] : keys[defaultLang][key];
  };
}
