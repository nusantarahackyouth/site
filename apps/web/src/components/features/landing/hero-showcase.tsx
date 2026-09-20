"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import PixelSwap, {
  type PixelSwapHandle,
} from "@/components/animation/pixel-swap";

import { cn } from "@/lib/utils";
import { defaultLocale, getLang, subscribeLocale, t } from "@nhy/i18n";

const SHOWCASE_INTERVAL = 5_000;

export type HeroShowcaseImage = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
};

type HeroShowcaseProps = {
  images: HeroShowcaseImage[];
  className?: string;
};

const getServerLocale = () => defaultLocale;

export default function HeroShowcase({ images, className }: HeroShowcaseProps) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLang,
    getServerLocale,
  );
  const swapRef = useRef<PixelSwapHandle>(null);
  const loadedImagesRef = useRef(new Set<number>());
  const [paused, setPaused] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);

  const markImageReady = useCallback((index: number) => {
    if (loadedImagesRef.current.has(index)) return;

    loadedImagesRef.current.add(index);
    if (loadedImagesRef.current.size === images.length) {
      setImagesReady(true);
    }
  }, []);

  useEffect(() => {
    if (paused || !imagesReady) return;

    const interval = setInterval(() => {
      swapRef.current?.swap();
    }, SHOWCASE_INTERVAL);

    return () => clearInterval(interval);
  }, [imagesReady, paused]);

  return (
    <span
      className={cn(
        "flex -rotate-1 flex-col gap-4 bg-white p-4 pb-10 text-black antialiased transition-[scale] hover:scale-105",
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <PixelSwap
        ref={swapRef}
        className="h-72 w-full md:h-96 md:w-160"
        aspectRatio="auto"
        pixelSize={16}
        pixelScale={1}
        duration={1500}
        pixelDuration={600}
        pattern="bottom-to-top"
        randomness={0.3}
        fade
        renderMode="canvas"
      >
        {() =>
          images.map(({ src, srcSet, width, height, alt }, index) => (
            <img
              key={src}
              src={src}
              srcSet={srcSet}
              sizes="(min-width: 768px) 640px, calc(100vw - 4rem)"
              alt={alt}
              width={width}
              height={height}
              className="h-full w-full object-cover object-center"
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
              decoding="async"
              onLoad={() => markImageReady(index)}
              ref={(image) => {
                if (image?.complete && image.naturalWidth) {
                  markImageReady(index);
                }
              }}
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
