"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import PixelSwap, {
  type PixelSwapHandle,
} from "@/components/animation/pixel-swap";

import { cn } from "@/lib/utils";
import { defaultLocale, getLang, subscribeLocale, t } from "@nhy/i18n";

import Sunbeam01 from "@/assets/photography/sunbeam-jakarta-26/photo-01.jpg";
import Sunbeam02 from "@/assets/photography/sunbeam-jakarta-26/photo-02.jpg";
import Sunbeam03 from "@/assets/photography/sunbeam-jakarta-26/photo-03.jpg";

const SHOWCASE_INTERVAL = 5_000;

const images = [
  { source: Sunbeam01, alt: "Sunbeam Jakarta gathering" },
  { source: Sunbeam02, alt: "Sunbeam Jakarta participants" },
  { source: Sunbeam03, alt: "Sunbeam Jakarta activities" },
];

type HeroShowcaseProps = {
  className?: string;
};

const getServerLocale = () => defaultLocale;

export default function HeroShowcase({ className }: HeroShowcaseProps) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLang,
    getServerLocale,
  );
  const swapRef = useRef<PixelSwapHandle>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      swapRef.current?.swap();
    }, SHOWCASE_INTERVAL);

    return () => clearInterval(interval);
  }, [paused]);

  return (
    <span
      className={cn(
        "flex -rotate-1 antialiased flex-col gap-4 bg-white p-4 pb-10 text-black transition-[scale] hover:scale-105",
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <PixelSwap
        ref={swapRef}
        className="h-96 w-160 max-w-[calc(100vw-2rem)]"
        aspectRatio="auto"
        pixelSize={16}
        pixelScale={1}
        duration={1500}
        pixelDuration={600}
        pattern="bottom-to-top"
        randomness={0.3}
        fade
      >
        {() =>
          images.map(({ source, alt }, index) => (
            <img
              key={source.src}
              src={source.src}
              alt={alt}
              width={source.width}
              height={source.height}
              className="h-full w-full object-cover object-center"
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
              decoding="async"
            />
          ))
        }
      </PixelSwap>
      <p className="text-center font-serif italic">
        {t("hero.cover.description", locale)}
      </p>
    </span>
  );
}
