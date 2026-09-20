import {
  Children,
  forwardRef,
  useCallback,
  useEffect,
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

type Transition = {
  to: number;
  grid: Grid;
};

const MAX_PIXELS = 220;
const KEYFRAME_STEPS = 14;
const PIXEL_OVERLAP = 1;
const HANDOFF_DURATION = 120;

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
    const angle =
      (Math.atan2(y - 0.5, x - 0.5) + Math.PI) / (Math.PI * 2);
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
  const contentFrames: Keyframe[] | null =
    startScale === 1 ? null : [];

  for (let step = 0; step <= KEYFRAME_STEPS; step += 1) {
    const progress = step / KEYFRAME_STEPS;
    const eased = ease(progress);
    const scale = startScale + (1 - startScale) * eased;

    windowFrames.push({
      offset: progress,
      opacity: fade ? Math.min(1, eased * 1.6) : 1,
      ...(contentFrames && { transform: `scale(${scale})` }),
    });
    contentFrames?.push({
      offset: progress,
      transform: `scale(${1 / scale})`,
    });
  }

  return { windowFrames, contentFrames };
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
    },
    ref,
  ) {
    const [internalIndex, setInternalIndex] = useState(initialIndex);
    const [shownIndex, setShownIndex] = useState(
      controlledIndex ?? initialIndex,
    );
    const [transition, setTransition] = useState<Transition | null>(null);
    const [box, setBox] = useState({ width: 0, height: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const layerRefs = useRef<Array<HTMLDivElement | null>>([]);
    const pixelRefs = useRef<Array<HTMLDivElement | null>>([]);
    const animationsRef = useRef<Animation[]>([]);
    const handoffAnimationRef = useRef<Animation | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    const configRef = useRef({
      duration,
      pixelDuration,
      pixelScale,
      fade,
      easing,
      onComplete,
    });
    const gridRef = useRef(grid);
    configRef.current = {
      duration,
      pixelDuration,
      pixelScale,
      fade,
      easing,
      onComplete,
    };
    gridRef.current = grid;

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
      handoffAnimationRef.current?.cancel();
      handoffAnimationRef.current = null;
      pixelRefs.current.forEach((pixel) => pixel?.replaceChildren());

      if (timerRef.current !== null) clearTimeout(timerRef.current);
      cancelAnimationFrame(handoffFrameRef.current);
      cancelAnimationFrame(cleanupFrameRef.current);
      timerRef.current = null;
      handoffFrameRef.current = 0;
      cleanupFrameRef.current = 0;
    }, []);

    useEffect(() => stopAnimations, [stopAnimations]);

    useEffect(() => {
      if (
        transition ||
        contentCount <= 1 ||
        desiredIndex === visibleIndex
      ) {
        return;
      }

      setTransition({ to: desiredIndex, grid: gridRef.current });
    }, [contentCount, desiredIndex, transition, visibleIndex]);

    useEffect(() => {
      if (!transition) return;

      const settings = configRef.current;
      const { grid: frozenGrid, to } = transition;

      const finish = () => {
        setShownIndex(to);

        handoffFrameRef.current = requestAnimationFrame(() => {
          cleanupFrameRef.current = requestAnimationFrame(() => {
            const overlay = overlayRef.current;
            if (!overlay) {
              stopAnimations();
              setTransition(null);
              settings.onComplete?.(to);
              return;
            }

            const handoffAnimation = overlay.animate(
              [{ opacity: 1 }, { opacity: 0 }],
              {
                duration: HANDOFF_DURATION,
                easing: "ease-out",
                fill: "forwards",
              },
            );
            handoffAnimationRef.current = handoffAnimation;
            handoffAnimation.onfinish = () => {
              if (handoffAnimationRef.current !== handoffAnimation) return;

              handoffAnimationRef.current = null;
              stopAnimations();
              setTransition(null);
              settings.onComplete?.(to);
            };
          });
        });
      };

      const source = layerRefs.current[to];
      if (
        !source ||
        frozenGrid.pixels.length === 0 ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        finish();
        return;
      }

      const total = Math.max(200, settings.duration);
      const pixelMilliseconds = clamp(settings.pixelDuration, 60, total);
      const spread = Math.max(0, total - pixelMilliseconds);
      const { windowFrames, contentFrames } = buildKeyframes({
        ease: makeEasing(settings.easing),
        startScale: clamp(settings.pixelScale, 0.05, 1),
        fade: settings.fade,
      });

      frozenGrid.pixels.forEach((pixel, pixelIndex) => {
        const pixelElement = pixelRefs.current[pixelIndex];
        if (!pixelElement) return;

        const content = document.createElement("div");
        content.className = "absolute";
        content.style.left = `${-pixel.left}px`;
        content.style.top = `${-pixel.top}px`;
        content.style.width = `${frozenGrid.width}px`;
        content.style.height = `${frozenGrid.height}px`;

        const pixelWindowSize = frozenGrid.size + PIXEL_OVERLAP;
        const originX = pixel.left + pixelWindowSize / 2;
        const originY = pixel.top + pixelWindowSize / 2;
        content.style.transformOrigin = `${originX}px ${originY}px`;

        const clone = source.cloneNode(true) as HTMLElement;
        clone.dataset.visible = "true";
        clone.removeAttribute("aria-hidden");
        content.appendChild(clone);
        pixelElement.replaceChildren(content);

        const timing: KeyframeAnimationOptions = {
          duration: pixelMilliseconds,
          delay: pixel.offset * spread,
          easing: "linear",
          fill: "both",
        };
        animationsRef.current.push(pixelElement.animate(windowFrames, timing));
        if (contentFrames) {
          animationsRef.current.push(content.animate(contentFrames, timing));
        }
      });

      timerRef.current = setTimeout(finish, total);
      return stopAnimations;
    }, [stopAnimations, transition]);

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

          return (
            <div
              key={contentIndex}
              ref={(element) => {
                layerRefs.current[contentIndex] = element;
              }}
              className="absolute inset-0 h-full w-full data-[visible=false]:invisible"
              data-visible={isShown}
              style={{ zIndex: isShown ? 2 : 1 }}
              aria-hidden={!isShown}
            >
              {content}
            </div>
          );
        })}

        {transition && (
          <div
            ref={overlayRef}
            className="pointer-events-none absolute inset-0 z-3"
            aria-hidden="true"
          >
            {transition.grid.pixels.map((pixel, pixelIndex) => (
              <div
                key={pixel.id}
                ref={(element) => {
                  pixelRefs.current[pixelIndex] = element;
                }}
                className="absolute overflow-hidden opacity-0 contain-[paint]"
                style={{
                  left: pixel.left,
                  top: pixel.top,
                  width: transition.grid.size + PIXEL_OVERLAP,
                  height: transition.grid.size + PIXEL_OVERLAP,
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

export default PixelSwap;
