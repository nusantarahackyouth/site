"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import PixelSwap, {
  type PixelSwapHandle,
} from "@/components/animation/pixel-swap";

import { cn } from "@/lib/utils";

const SHOWCASE_INTERVAL = 5_000;

export type HeroShowcaseImage = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
};

type HeroShowcaseProps = {
  src: HeroShowcaseImage | HeroShowcaseImage[];
  className?: string;
  imageClassName?: string;
  children?: ReactNode;
};

export default function HeroShowcase({
  src,
  className,
  imageClassName,
  children,
}: HeroShowcaseProps) {
  const images = Array.isArray(src) ? src : [src];
  const isAnimated = images.length > 1;
  const swapRef = useRef<PixelSwapHandle>(null);
  const loadedImagesRef = useRef(new Set<number>());
  const [paused, setPaused] = useState(false);
  const [imagesReady, setImagesReady] = useState(!isAnimated);

  const markImageReady = useCallback(
    (index: number) => {
      if (loadedImagesRef.current.has(index)) return;

      loadedImagesRef.current.add(index);
      if (loadedImagesRef.current.size === images.length) {
        setImagesReady(true);
      }
    },
    [images.length],
  );

  useEffect(() => {
    if (!isAnimated || paused || !imagesReady) return;

    const interval = setInterval(() => {
      swapRef.current?.swap();
    }, SHOWCASE_INTERVAL);

    return () => clearInterval(interval);
  }, [imagesReady, isAnimated, paused]);

  const renderImage = (image: HeroShowcaseImage, index: number) => (
    <img
      key={image.src}
      src={image.src}
      srcSet={image.srcSet}
      sizes="(min-width: 768px) 640px, calc(100vw - 4rem)"
      alt={image.alt}
      width={image.width}
      height={image.height}
      className={cn(
        "w-full object-cover object-center",
        isAnimated ? "h-full" : "h-72 md:h-96 md:w-160",
        imageClassName,
      )}
      loading={index === 0 ? "eager" : "lazy"}
      fetchPriority={index === 0 ? "high" : "auto"}
      decoding="async"
      onLoad={isAnimated ? () => markImageReady(index) : undefined}
      ref={
        isAnimated
          ? (element) => {
              if (element?.complete && element.naturalWidth) {
                markImageReady(index);
              }
            }
          : undefined
      }
    />
  );

  return (
    <span
      className={cn(
        "flex flex-col gap-4 bg-white p-4 pb-10 text-black antialiased drop-shadow",
        className,
      )}
      onMouseEnter={isAnimated ? () => setPaused(true) : undefined}
      onMouseLeave={isAnimated ? () => setPaused(false) : undefined}
      onFocusCapture={isAnimated ? () => setPaused(true) : undefined}
      onBlurCapture={isAnimated ? () => setPaused(false) : undefined}
    >
      {isAnimated ? (
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
          {() => images.map(renderImage)}
        </PixelSwap>
      ) : (
        images[0] && renderImage(images[0], 0)
      )}
      {children}
    </span>
  );
}
