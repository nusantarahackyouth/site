import { useState, useEffect } from "react";
import { LayoutGroup, motion } from "motion/react";
import RotatingText from "./ui/rotating-text";
import { t, getLang, type TranslationKey } from "@nhy/i18n";

const rotatingKeys: TranslationKey[] = [
  "hero.rotating.1",
  "hero.rotating.2",
  "hero.rotating.3",
];

function syncLang() {
  const lang = getLang();
  return { lang, texts: rotatingKeys.map((k) => t(k, lang)) };
}

export default function HeroRotating() {
  const [state, setState] = useState(() => ({
    lang: "en" as "en" | "id",
    texts: rotatingKeys.map((k) => t(k, "en")),
  }));

  useEffect(() => {
    setState(syncLang());

    const update = () => setState(syncLang());
    window.addEventListener("locale-change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("locale-change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <LayoutGroup>
      <motion.h1 className="-z-10 flex flex-wrap items-center gap-3" layout>
        <motion.span
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          layout
        >
          {t("hero.tagline.1a", state.lang)}
        </motion.span>
        <RotatingText
          texts={state.texts}
          mainClassName="py-1 text-red-600"
          staggerFrom={"last"}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-120%" }}
          staggerDuration={0.025}
          splitLevelClassName="overflow-hidden pb-0.5"
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          rotationInterval={3500}
        />
        <motion.span
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          layout
        >
          {t("hero.tagline.1b", state.lang)}
        </motion.span>
      </motion.h1>
    </LayoutGroup>
  );
}