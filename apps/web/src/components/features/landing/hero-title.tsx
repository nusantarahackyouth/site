"use client";

import { useSyncExternalStore } from "react";

import { defaultLocale, getLang, subscribeLocale, t } from "@nhy/i18n";
import { LocalizedRotatingPixelText } from "@/components/animation/pixel-rotating-text";

const getServerLocale = () => defaultLocale;

export default function HeroTitle() {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLang,
    getServerLocale,
  );

  return (
    <div className="flex flex-col text-center font-serif text-[2.5rem] leading-tight sm:text-5xl lg:text-6xl tracking-tight font-medium">
      <h1 className="flex flex-wrap items-baseline justify-center gap-x-[0.2em] max-w-5xl">
        <span className="w-full lg:w-[unset]">{t("hero.tagline.1", locale)}</span>
        <LocalizedRotatingPixelText
          translationKey="hero.rotating"
          duration={4}
          animationDuration={1}
          widthTransition={[0.77, 0, 0.18, 1]}
          className="text-primary mx-0 block text-left drop-shadow-primary"
        />
        <span className="w-full lg:w-[unset]">{t("hero.tagline.2", locale)}</span>
      </h1>
    </div>
  );
}
