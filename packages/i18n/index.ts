import en from "./translations/ui/en";
import id from "./translations/ui/id";

export const locales = ["en", "id"] as const;
export type Locale = (typeof locales)[number];
export type TranslationKey = keyof typeof en;

const translations: Record<Locale, typeof en> = { en, id };

const COOKIE_NAME = "locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function getLang(): Locale {
  if (typeof document === "undefined") return "en";

  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (cookie) {
    const val = cookie.split("=")[1] as Locale;
    if (locales.includes(val)) return val;
  }

  const browserLang = navigator.language.split("-")[0];
  if (locales.includes(browserLang as Locale)) return browserLang as Locale;

  return "en";
}

export function t(key: TranslationKey, lang?: Locale): string {
  const l = lang ?? getLang();
  return translations[l][key] ?? translations.en[key];
}

export function swapTranslations(lang?: Locale): void {
  const l = lang ?? getLang();
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n") as TranslationKey;
    if (key && key in translations[l]) {
      el.textContent = translations[l][key];
    }
  });
  document.documentElement.lang = l;
}

export function setLang(lang: Locale): void {
  document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=${COOKIE_MAX_AGE}`;
  swapTranslations(lang);
  window.dispatchEvent(new CustomEvent("locale-change", { detail: lang }));
}