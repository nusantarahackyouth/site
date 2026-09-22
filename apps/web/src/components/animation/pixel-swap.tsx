
import {
  Children,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type PixelSwapPattern =
  | "random"
  | "center"
  | "edges"
  | "left-to-right"
  | "right-to-left"
  | "top-to-bottom"
  | "bottom-to-top"
  | "diagonal"
  | "spiral";

export type PixelSwapTrigger = "hover" | "click";
export type PixelSwapRenderMode = "svg" | "canvas";

export type PixelSwapControls = {
  activeIndex: number;
  transitioning: boolean;
  swap: (index?: number) => void;
};

export type PixelSwapHandle = {
  swap: (index?: number) => void;
};

export interface PixelSwapProps {
  children: (controls: PixelSwapControls) => readonly ReactNode[];
  pixelSize?: number;
  pixelScale?: number;
  fade?: boolean;
  duration?: number;
  pixelDuration?: number;
  pattern?: PixelSwapPattern;
  randomness?: number;
  easing?: string;
  trigger?: PixelSwapTrigger;
  initialIndex?: number;
  index?: number;
  onIndexChange?: (index: number) => void;
  onComplete?: (index: number) => void;
  aspectRatio?: string;
  className?: string;
  style?: CSSProperties;
  renderMode?: PixelSwapRenderMode;
}

type Pixel = {
  id: number;
  left: number;
  top: number;
  offset: number;
};

type Grid = {
  pixels: Pixel[];
  size: number;
  width: number;
  height: number;
};

type CanvasPlan = {
  frameDuration: number;
  frameCount: number;
  opacities: Uint8Array;
  scales: Uint16Array | null;
  total: number;
};

type Transition = {
  to: number;
  grid: Grid;
  canvasPlan: CanvasPlan | null;
};

type PreparedImage = {
  canvas: HTMLCanvasElement;
  key: string;
};

const MAX_PIXELS = 220;
const KEYFRAME_STEPS = 14;
const PIXEL_OVERLAP = 1;
const CANVAS_FRAME_DURATION = 1000 / 60;

const PATTERNS: Record<
  PixelSwapPattern,
  (x: number, y: number) => number | null
> = {
  random: () => null,
  center: (x, y) => Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2,
  edges: (x, y) => Math.min(x, 1 - x, y, 1 - y) * 2,
  "left-to-right": (x) => x,
  "right-to-left": (x) => 1 - x,
  "top-to-bottom": (_x, y) => y,
  "bottom-to-top": (_x, y) => 1 - y,
  diagonal: (x, y) => (x + y) / 2,
  spiral: (x, y) => {
    const angle = (Math.atan2(y - 0.5, x - 0.5) + Math.PI) / (Math.PI * 2);
    const radius = Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2;
    return (angle + radius) % 1;
  },
};

const EASINGS: Record<string, number[]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const normalizeIndex = (index: number, count: number) =>
  count > 0 ? ((Math.trunc(index) % count) + count) % count : 0;

const noise = (seed: number) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

const snapToDevicePixel = (value: number) => {
  const ratio = typeof window === "undefined" ? 1 : window.devicePixelRatio;
  return Math.round(value * ratio) / ratio;
};

const parseObjectPosition = (value: string) => {
  const positions = value.trim().split(/\s+/);
  const parse = (position: string | undefined, fallback: number) => {
    if (!position) return fallback;
    if (position === "left" || position === "top") return 0;
    if (position === "right" || position === "bottom") return 1;
    if (position === "center") return 0.5;
    if (position.endsWith("%")) {
      return clamp(Number.parseFloat(position) / 100, 0, 1);
    }
    return fallback;
  };

  return {
    x: parse(positions[0], 0.5),
    y: parse(positions[1] ?? positions[0], 0.5),
  };
};

const getPreparedImageKey = (
  image: HTMLImageElement,
  width: number,
  height: number,
) => {
  const styles = getComputedStyle(image);
  return [
    image.currentSrc || image.src,
    width,
    height,
    window.devicePixelRatio,
    styles.objectFit,
    styles.objectPosition,
  ].join("|");
};

const rasterizeImage = (
  image: HTMLImageElement,
  width: number,
  height: number,
) => {
  const ratio = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));

  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const styles = getComputedStyle(image);
  const intrinsicWidth = image.naturalWidth || width;
  const intrinsicHeight = image.naturalHeight || height;
  let drawWidth = width;
  let drawHeight = height;

  if (styles.objectFit === "cover" || styles.objectFit === "contain") {
    const scale =
      styles.objectFit === "cover"
        ? Math.max(width / intrinsicWidth, height / intrinsicHeight)
        : Math.min(width / intrinsicWidth, height / intrinsicHeight);
    drawWidth = intrinsicWidth * scale;
    drawHeight = intrinsicHeight * scale;
  } else if (styles.objectFit === "none") {
    drawWidth = intrinsicWidth;
    drawHeight = intrinsicHeight;
  } else if (styles.objectFit === "scale-down") {
    const scale = Math.min(1, width / intrinsicWidth, height / intrinsicHeight);
    drawWidth = intrinsicWidth * scale;
    drawHeight = intrinsicHeight * scale;
  }

  const position = parseObjectPosition(styles.objectPosition);
  const drawX = (width - drawWidth) * position.x;
  const drawY = (height - drawHeight) * position.y;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    drawX * ratio,
    drawY * ratio,
    drawWidth * ratio,
    drawHeight * ratio,
  );
  return canvas;
};

const makeEasing = (value: string): ((progress: number) => number) => {
  const match = /cubic-bezier\(([^)]+)\)/.exec(value);
  const points = match ? match[1]?.split(",").map(Number) : EASINGS[value];

  if (!points || points.length !== 4 || points.some(Number.isNaN)) {
    return makeEasing("ease");
  }

  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = points;
  if (x1 === y1 && x2 === y2) return (progress) => progress;

  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  return (progress) => {
    let time = progress;

    for (let iteration = 0; iteration < 5; iteration += 1) {
      const slope = (3 * ax * time + 2 * bx) * time + cx;
      if (!slope) break;
      time -= (((ax * time + bx) * time + cx) * time - progress) / slope;
    }

    time = clamp(time, 0, 1);
    return ((ay * time + by) * time + cy) * time;
  };
};

const buildGrid = ({
  width,
  height,
  pixelSize,
  pattern,
  randomness,
}: {
  width: number;
  height: number;
  pixelSize: number;
  pattern: PixelSwapPattern;
  randomness: number;
}): Grid => {
  if (width <= 0 || height <= 0) {
    return { pixels: [], size: pixelSize, width, height };
  }

  let size = pixelSize;
  let columns = Math.max(1, Math.ceil(width / size));
  let rows = Math.max(1, Math.ceil(height / size));

  if (columns * rows > MAX_PIXELS) {
    size = Math.ceil(size * Math.sqrt((columns * rows) / MAX_PIXELS));
    columns = Math.max(1, Math.ceil(width / size));
    rows = Math.max(1, Math.ceil(height / size));
  }

  const originX = (width - columns * size) / 2;
  const originY = (height - rows * size) / 2;
  const order = PATTERNS[pattern];
  const mix = clamp(randomness, 0, 1);
  const pixels: Pixel[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const id = row * columns + column;
      const x = columns <= 1 ? 0.5 : column / (columns - 1);
      const y = rows <= 1 ? 0.5 : row / (rows - 1);
      const orderedOffset = order(x, y);
      const randomOffset = noise(id + 1);

      pixels.push({
        id,
        left: snapToDevicePixel(originX + column * size),
        top: snapToDevicePixel(originY + row * size),
        offset:
          orderedOffset === null
            ? randomOffset
            : orderedOffset * (1 - mix) + randomOffset * mix,
      });
    }
  }

  return { pixels, size, width, height };
};

const buildCanvasPlan = ({
  grid,
  duration,
  pixelDuration,
  pixelScale,
  fade,
  easing,
}: {
  grid: Grid;
  duration: number;
  pixelDuration: number;
  pixelScale: number;
  fade: boolean;
  easing: string;
}): CanvasPlan => {
  const total = Math.max(200, duration);
  const pixelMilliseconds = clamp(pixelDuration, 60, total);
  const spread = Math.max(0, total - pixelMilliseconds);
  const frameCount = Math.ceil(total / CANVAS_FRAME_DURATION) + 1;
  const opacities = new Uint8Array(frameCount * grid.pixels.length);
  const startScale = clamp(pixelScale, 0.05, 1);
  const scales = startScale === 1 ? null : new Uint16Array(opacities.length);
  const ease = makeEasing(easing);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const elapsed = Math.min(frame * CANVAS_FRAME_DURATION, total);

    grid.pixels.forEach((pixel, pixelIndex) => {
      const valueIndex = frame * grid.pixels.length + pixelIndex;
      const progress = clamp(
        (elapsed - pixel.offset * spread) / pixelMilliseconds,
        0,
        1,
      );
      const eased = ease(progress);
      opacities[valueIndex] = Math.round(
        255 * (fade ? Math.min(1, eased * 1.6) : 1),
      );
      if (scales) {
        scales[valueIndex] = Math.round(
          65535 * (startScale + (1 - startScale) * eased),
        );
      }
    });
  }

  return {
    frameDuration: CANVAS_FRAME_DURATION,
    frameCount,
    opacities,
    scales,
    total,
  };
};

const buildKeyframes = ({
  ease,
  startScale,
  fade,
}: {
  ease: (progress: number) => number;
  startScale: number;
  fade: boolean;
}) => {
  const windowFrames: Keyframe[] = [];

  for (let step = 0; step <= KEYFRAME_STEPS; step += 1) {
    const progress = step / KEYFRAME_STEPS;
    const eased = ease(progress);
    const scale = startScale + (1 - startScale) * eased;

    windowFrames.push({
      offset: progress,
      opacity: fade ? Math.min(1, eased * 1.6) : 1,
      transform: `scale(${scale})`,
    });
  }

  return windowFrames;
};

const PixelSwap = forwardRef<PixelSwapHandle, PixelSwapProps>(
  function PixelSwap(
    {
      children,
      pixelSize = 64,
      pixelScale = 0.35,
      fade = true,
      duration = 1400,
      pixelDuration = 450,
      pattern = "random",
      randomness = 0,
      easing = "cubic-bezier(0.22, 1, 0.36, 1)",
      trigger,
      initialIndex = 0,
      index: controlledIndex,
      onIndexChange,
      onComplete,
      aspectRatio = "16 / 10",
      className,
      style,
      renderMode = "svg",
    },
    ref,
  ) {
    const [internalIndex, setInternalIndex] = useState(initialIndex);
    const [shownIndex, setShownIndex] = useState(
      controlledIndex ?? initialIndex,
    );
    const [transition, setTransition] = useState<Transition | null>(null);
    const [box, setBox] = useState({ width: 0, height: 0 });

    const maskId = useId().replaceAll(":", "");
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const layerRefs = useRef<Array<HTMLDivElement | null>>([]);
    const pixelRefs = useRef<Array<SVGRectElement | null>>([]);
    const animationsRef = useRef<Animation[]>([]);
    const preparedImagesRef = useRef(new Map<number, PreparedImage>());
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const canvasFrameRef = useRef(0);
    const handoffFrameRef = useRef(0);
    const cleanupFrameRef = useRef(0);
    const contentCountRef = useRef(0);
    const desiredIndexRef = useRef(controlledIndex ?? initialIndex);
    const shownIndexRef = useRef(shownIndex);
    const hoverOriginRef = useRef(shownIndex);

    const requestIndex = useCallback(
      (requestedIndex?: number) => {
        const count = contentCountRef.current;
        if (count <= 1) return;

        const nextIndex = normalizeIndex(
          requestedIndex ?? desiredIndexRef.current + 1,
          count,
        );
        if (nextIndex === desiredIndexRef.current) return;

        if (controlledIndex === undefined) setInternalIndex(nextIndex);
        onIndexChange?.(nextIndex);
      },
      [controlledIndex, onIndexChange],
    );

    useImperativeHandle(ref, () => ({ swap: requestIndex }), [requestIndex]);

    const contents = Children.toArray(
      children({
        activeIndex: shownIndex,
        transitioning: transition !== null,
        swap: requestIndex,
      }),
    );
    const contentCount = contents.length;
    const desiredIndex = normalizeIndex(
      controlledIndex ?? internalIndex,
      contentCount,
    );
    const visibleIndex = normalizeIndex(shownIndex, contentCount);

    contentCountRef.current = contentCount;
    desiredIndexRef.current = desiredIndex;
    shownIndexRef.current = visibleIndex;

    const grid = useMemo(
      () =>
        buildGrid({
          width: box.width,
          height: box.height,
          pixelSize: Math.max(8, Math.round(pixelSize)),
          pattern,
          randomness,
        }),
      [box.height, box.width, pattern, pixelSize, randomness],
    );
    const canvasPlan = useMemo(
      () =>
        renderMode === "canvas"
          ? buildCanvasPlan({
              grid,
              duration,
              pixelDuration,
              pixelScale,
              fade,
              easing,
            })
          : null,
      [duration, easing, fade, grid, pixelDuration, pixelScale, renderMode],
    );

    const configRef = useRef({
      duration,
      pixelDuration,
      pixelScale,
      fade,
      easing,
      onComplete,
    });
    const gridRef = useRef(grid);
    const canvasPlanRef = useRef(canvasPlan);
    configRef.current = {
      duration,
      pixelDuration,
      pixelScale,
      fade,
      easing,
      onComplete,
    };
    gridRef.current = grid;
    canvasPlanRef.current = canvasPlan;

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const measure = () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) return;

        setBox((current) =>
          current.width === width && current.height === height
            ? current
            : { width, height },
        );
      };

      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    const stopAnimations = useCallback(() => {
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current = [];

      if (timerRef.current !== null) clearTimeout(timerRef.current);
      cancelAnimationFrame(canvasFrameRef.current);
      cancelAnimationFrame(handoffFrameRef.current);
      cancelAnimationFrame(cleanupFrameRef.current);
      timerRef.current = null;
      canvasFrameRef.current = 0;
      handoffFrameRef.current = 0;
      cleanupFrameRef.current = 0;
    }, []);

    useEffect(() => stopAnimations, [stopAnimations]);

    useEffect(() => {
      if (renderMode !== "canvas" || !box.width || !box.height) return;

      let cancelled = false;
      const cancelScheduled: Array<() => void> = [];
      preparedImagesRef.current.clear();

      const schedule = (callback: () => void) => {
        if ("requestIdleCallback" in window) {
          const callbackId = window.requestIdleCallback(callback, {
            timeout: 1000,
          });
          cancelScheduled.push(() => window.cancelIdleCallback(callbackId));
          return;
        }

        const timeoutId = setTimeout(callback, 0);
        cancelScheduled.push(() => clearTimeout(timeoutId));
      };

      const removeLoadListeners: Array<() => void> = [];

      layerRefs.current
        .slice(0, contentCount)
        .forEach((layer, contentIndex) => {
          const image = layer?.querySelector("img");
          if (!image) return;

          const rasterize = () => {
            const prepare = () => {
              schedule(() => {
                if (cancelled || !image.complete || !image.naturalWidth) {
                  return;
                }

                preparedImagesRef.current.set(contentIndex, {
                  canvas: rasterizeImage(image, box.width, box.height),
                  key: getPreparedImageKey(image, box.width, box.height),
                });
              });
            };

            image.decode().then(prepare, prepare);
          };

          if (image.complete && image.naturalWidth) {
            rasterize();
            return;
          }

          image.addEventListener("load", rasterize, { once: true });
          removeLoadListeners.push(() =>
            image.removeEventListener("load", rasterize),
          );
        });

      return () => {
        cancelled = true;
        cancelScheduled.forEach((cancel) => cancel());
        removeLoadListeners.forEach((remove) => remove());
        preparedImagesRef.current.clear();
      };
    }, [box.height, box.width, contentCount, renderMode]);

    useEffect(() => {
      if (transition || contentCount <= 1 || desiredIndex === visibleIndex) {
        return;
      }

      setTransition({
        to: desiredIndex,
        grid: gridRef.current,
        canvasPlan: canvasPlanRef.current,
      });
    }, [contentCount, desiredIndex, transition, visibleIndex]);

    useEffect(() => {
      if (!transition) return;

      const settings = configRef.current;
      const { canvasPlan: frozenCanvasPlan, grid: frozenGrid, to } = transition;

      const finish = () => {
        setShownIndex(to);

        handoffFrameRef.current = requestAnimationFrame(() => {
          cleanupFrameRef.current = requestAnimationFrame(() => {
            stopAnimations();
            setTransition(null);
            settings.onComplete?.(to);
          });
        });
      };

      if (
        frozenGrid.pixels.length === 0 ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        finish();
        return;
      }

      if (renderMode === "canvas") {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        const image = layerRefs.current[to]?.querySelector("img");

        if (!canvas || !context || !image || !frozenCanvasPlan) {
          finish();
          return;
        }

        let cancelled = false;

        const run = async () => {
          try {
            await image.decode();
          } catch {
            // A loaded image can remain drawable when decode() rejects.
          }

          if (cancelled || !image.complete || !image.naturalWidth) {
            if (!cancelled) finish();
            return;
          }

          const preparedKey = getPreparedImageKey(
            image,
            frozenGrid.width,
            frozenGrid.height,
          );
          const prepared = preparedImagesRef.current.get(to);
          const imageCanvas =
            prepared?.key === preparedKey
              ? prepared.canvas
              : rasterizeImage(image, frozenGrid.width, frozenGrid.height);
          const physicalWidth = imageCanvas.width;
          const physicalHeight = imageCanvas.height;
          const ratio = physicalWidth / frozenGrid.width;
          const maskCanvas = document.createElement("canvas");
          maskCanvas.width = physicalWidth;
          maskCanvas.height = physicalHeight;
          canvas.width = physicalWidth;
          canvas.height = physicalHeight;

          const maskContext = maskCanvas.getContext("2d");
          if (!maskContext) {
            finish();
            return;
          }

          const pixelCount = frozenGrid.pixels.length;
          const pixelWindowSize = frozenGrid.size + PIXEL_OVERLAP;
          let startedAt: number | null = null;

          const draw = (timestamp: number) => {
            if (cancelled) return;
            startedAt ??= timestamp;

            const elapsed = Math.min(
              timestamp - startedAt,
              frozenCanvasPlan.total,
            );
            const frame = Math.min(
              frozenCanvasPlan.frameCount - 1,
              Math.floor(elapsed / frozenCanvasPlan.frameDuration),
            );
            const frameOffset = frame * pixelCount;

            maskContext.clearRect(0, 0, physicalWidth, physicalHeight);
            maskContext.fillStyle = "white";

            frozenGrid.pixels.forEach((pixel, pixelIndex) => {
              const valueIndex = frameOffset + pixelIndex;
              const opacity = frozenCanvasPlan.opacities[valueIndex] ?? 0;
              if (opacity === 0) return;

              const scale = frozenCanvasPlan.scales
                ? (frozenCanvasPlan.scales[valueIndex] ?? 0) / 65535
                : 1;
              const size = pixelWindowSize * scale;
              const inset = (pixelWindowSize - size) / 2;
              maskContext.globalAlpha = opacity / 255;
              maskContext.fillRect(
                (pixel.left + inset) * ratio,
                (pixel.top + inset) * ratio,
                size * ratio,
                size * ratio,
              );
            });

            maskContext.globalAlpha = 1;
            context.clearRect(0, 0, physicalWidth, physicalHeight);
            context.globalCompositeOperation = "source-over";
            context.drawImage(imageCanvas, 0, 0);
            context.globalCompositeOperation = "destination-in";
            context.drawImage(maskCanvas, 0, 0);
            context.globalCompositeOperation = "source-over";

            if (elapsed >= frozenCanvasPlan.total) {
              finish();
              return;
            }

            canvasFrameRef.current = requestAnimationFrame(draw);
          };

          canvasFrameRef.current = requestAnimationFrame(draw);
        };

        void run();
        return () => {
          cancelled = true;
          stopAnimations();
        };
      }

      const total = Math.max(200, settings.duration);
      const pixelMilliseconds = clamp(settings.pixelDuration, 60, total);
      const spread = Math.max(0, total - pixelMilliseconds);
      const windowFrames = buildKeyframes({
        ease: makeEasing(settings.easing),
        startScale: clamp(settings.pixelScale, 0.05, 1),
        fade: settings.fade,
      });

      frozenGrid.pixels.forEach((pixel, pixelIndex) => {
        const pixelElement = pixelRefs.current[pixelIndex];
        if (!pixelElement) return;

        const timing: KeyframeAnimationOptions = {
          duration: pixelMilliseconds,
          delay: pixel.offset * spread,
          easing: "linear",
          fill: "both",
        };
        animationsRef.current.push(pixelElement.animate(windowFrames, timing));
      });

      timerRef.current = setTimeout(finish, total);
      return stopAnimations;
    }, [renderMode, stopAnimations, transition]);

    const interactionProps = useMemo(() => {
      if (trigger === "hover") {
        const restoreHoverOrigin = () => requestIndex(hoverOriginRef.current);

        return {
          onMouseEnter: () => {
            hoverOriginRef.current = shownIndexRef.current;
            requestIndex();
          },
          onMouseLeave: restoreHoverOrigin,
          onFocus: () => {
            hoverOriginRef.current = shownIndexRef.current;
            requestIndex();
          },
          onBlur: restoreHoverOrigin,
          tabIndex: 0,
        };
      }

      if (trigger === "click") {
        return {
          onClick: () => requestIndex(),
          onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              requestIndex();
            }
          },
          role: "button",
          tabIndex: 0,
        };
      }

      return {};
    }, [requestIndex, trigger]);

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative isolate w-full overflow-hidden outline-none",
          className,
        )}
        style={{ aspectRatio, ...style }}
        data-active-index={visibleIndex}
        data-transitioning={transition !== null}
        {...interactionProps}
      >
        {contents.map((content, contentIndex) => {
          const isShown = contentIndex === visibleIndex;
          const isTransitionTarget =
            renderMode === "svg" && transition?.to === contentIndex && !isShown;

          return (
            <div
              key={contentIndex}
              ref={(element) => {
                layerRefs.current[contentIndex] = element;
              }}
              className="absolute inset-0 h-full w-full data-[visible=false]:invisible"
              data-visible={isShown || isTransitionTarget}
              style={{
                zIndex: isTransitionTarget ? 3 : isShown ? 2 : 1,
                ...(isTransitionTarget && {
                  mask: `url(#${maskId})`,
                  WebkitMask: `url(#${maskId})`,
                }),
              }}
              aria-hidden={!isShown}
            >
              {content}
            </div>
          );
        })}

        {transition && renderMode === "svg" && (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute size-0"
          >
            <defs>
              <mask
                id={maskId}
                x={0}
                y={0}
                width={transition.grid.width}
                height={transition.grid.height}
                maskUnits="userSpaceOnUse"
                maskContentUnits="userSpaceOnUse"
                style={{ maskType: "alpha" }}
              >
                {transition.grid.pixels.map((pixel, pixelIndex) => (
                  <rect
                    key={pixel.id}
                    ref={(element) => {
                      pixelRefs.current[pixelIndex] = element;
                    }}
                    x={pixel.left}
                    y={pixel.top}
                    width={transition.grid.size + PIXEL_OVERLAP}
                    height={transition.grid.size + PIXEL_OVERLAP}
                    fill="white"
                    shapeRendering="crispEdges"
                    style={{
                      opacity: 0,
                      transformBox: "fill-box",
                      transformOrigin: "center",
                    }}
                  />
                ))}
              </mask>
            </defs>
          </svg>
        )}

        {transition && renderMode === "canvas" && (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-3 h-full w-full"
          />
        )}
      </div>
    );
  },
);

export default PixelSwap;
