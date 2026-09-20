"use client";

import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { animate, motion, useMotionValue } from "motion/react";
import {
  defaultLocale,
  getLang,
  subscribeLocale,
  t,
  type ArrayTranslationKey,
  type Locale,
} from "@nhy/i18n";
import { cn } from "@/lib/utils";

export type PixelRotatingTextTransition = "cubic" | "quartic";

export type CubicBezier = [number, number, number, number];

export type RotatingPixelTextProps = {
  texts: string[];
  duration?: number;
  animationDuration?: number;
  widthTransition?: CubicBezier;
  className?: string;
  textClassName?: string;
  alignmentClassName?: string;
};

export type LocalizedRotatingPixelTextProps = Omit<
  RotatingPixelTextProps,
  "texts"
> & {
  translationKey: ArrayTranslationKey;
  initialLocale?: Locale;
};

export function LocalizedRotatingPixelText({
  translationKey,
  initialLocale = defaultLocale,
  ...props
}: LocalizedRotatingPixelTextProps) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLang,
    () => initialLocale,
  );
  const texts = useMemo(
    () => t(translationKey, locale),
    [locale, translationKey],
  );

  return <RotatingPixelText {...props} texts={texts} />;
}

const DEFAULT_WIDTH_TRANSITION: CubicBezier = [0.22, 1, 0.36, 1];
const ROWS = 8;
const PIXEL_FADE_RATIO = 0.2;
const INCOMING_DELAY_RATIO = 0.2;

function createRandomColumnRanks(columnCount: number) {
  return Array.from({ length: ROWS }, (_, row) => {
    const columns = Array.from({ length: columnCount }, (_, column) => column);

    // A deterministic shuffle keeps hydration stable while giving every row a
    // different horizontal starting point.
    for (let index = columns.length - 1; index > 0; index--) {
      const random = Math.abs(Math.sin((row + 1) * 997 + index * 37));
      const swapIndex = Math.floor(random * (index + 1));
      [columns[index], columns[swapIndex]] = [
        columns[swapIndex]!,
        columns[index]!,
      ];
    }

    return columns.reduce<number[]>((ranks, column, rank) => {
      ranks[column] = rank;
      return ranks;
    }, []);
  });
}

type PixelGridDimensions = {
  width: number;
  height: number;
};

type PixelCell = {
  clipPath: string;
  delay: number;
};

type PixelGrid = {
  cells: PixelCell[];
  pixelDuration: number;
};

function createPixelGrid(
  dimensions: PixelGridDimensions,
  animationDuration: number,
): PixelGrid {
  const pixelSize = dimensions.height / ROWS;
  const columns = Math.max(1, Math.ceil(dimensions.width / pixelSize));
  const randomColumnRanks = createRandomColumnRanks(columns);
  const rowDelay = ROWS > 1 ? (animationDuration * 0.65) / (ROWS - 1) : 0;
  const columnDelay =
    columns > 1 ? (animationDuration * 0.15) / (columns - 1) : 0;

  const cells = Array.from({ length: ROWS * columns }, (_, pixel) => {
    const row = Math.floor(pixel / columns);
    const column = pixel % columns;
    const rowFromBottom = ROWS - 1 - row;
    const columnRank = randomColumnRanks[row]?.[column] ?? column;
    const top = row * pixelSize;
    const right = Math.max(dimensions.width - (column + 1) * pixelSize, 0);
    const bottom = Math.max(dimensions.height - (row + 1) * pixelSize, 0);
    const left = column * pixelSize;

    return {
      clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px)`,
      delay: rowFromBottom * rowDelay + columnRank * columnDelay,
    };
  });

  return {
    cells,
    pixelDuration: animationDuration * PIXEL_FADE_RATIO,
  };
}

type PixelMaskLayerProps = {
  text: string;
  direction: "in" | "out";
  grid: PixelGrid;
  alignmentClassName: string;
  textClassName?: string;
  startDelay?: number;
};

function PixelMaskLayer({
  text,
  direction,
  grid,
  alignmentClassName,
  textClassName,
  startDelay = 0,
}: PixelMaskLayerProps) {
  const initialOpacity = direction === "out" ? 1 : 0;
  const targetOpacity = direction === "out" ? 0 : 1;

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {grid.cells.map((cell, pixel) => (
        <motion.span
          key={pixel}
          className={cn(
            "absolute inset-0 flex py-4 whitespace-nowrap will-change-[opacity]",
            alignmentClassName,
            textClassName,
          )}
          style={{ clipPath: cell.clipPath }}
          initial={{ opacity: initialOpacity }}
          animate={{ opacity: targetOpacity }}
          transition={{
            duration: grid.pixelDuration,
            delay: startDelay + cell.delay,
            ease: "easeInOut",
          }}
        >
          {text}
        </motion.span>
      ))}
    </span>
  );
}

type PixelTransitionCanvasProps = {
  outgoingText: string;
  incomingText: string;
  animationDuration: number;
  incomingDelay: number;
  alignmentClassName: string;
  textClassName?: string;
};

const PixelTransitionCanvas = memo(function PixelTransitionCanvas({
  outgoingText,
  incomingText,
  animationDuration,
  incomingDelay,
  alignmentClassName,
  textClassName,
}: PixelTransitionCanvasProps) {
  const canvasRef = useRef<HTMLSpanElement>(null);
  const [dimensions, setDimensions] = useState<PixelGridDimensions | null>(
    null,
  );
  const grid = useMemo(
    () => (dimensions ? createPixelGrid(dimensions, animationDuration) : null),
    [animationDuration, dimensions],
  );

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateDimensions = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;

      setDimensions((current) =>
        current?.width === width && current.height === height
          ? current
          : { width, height },
      );
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 -my-4 flex",
        alignmentClassName,
      )}
    >
      <span ref={canvasRef} className="relative inline-grid w-max py-4">
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {outgoingText}
        </span>
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {incomingText}
        </span>
        {grid && (
          <>
            <PixelMaskLayer
              text={outgoingText}
              direction="out"
              grid={grid}
              alignmentClassName={alignmentClassName}
              textClassName={textClassName}
            />
            <PixelMaskLayer
              text={incomingText}
              direction="in"
              grid={grid}
              alignmentClassName={alignmentClassName}
              textClassName={textClassName}
              startDelay={incomingDelay}
            />
          </>
        )}
      </span>
    </span>
  );
});

type RotationState = {
  index: number;
  outgoingIndex: number | null;
  transitionId: number;
  isHandoff: boolean;
};

export function RotatingPixelText({
  texts,
  duration = 3,
  animationDuration = 1,
  widthTransition = DEFAULT_WIDTH_TRANSITION,
  className = "",
  textClassName,
  alignmentClassName = "justify-start",
}: RotatingPixelTextProps) {
  const [rotation, setRotation] = useState<RotationState>({
    index: 0,
    outgoingIndex: null,
    transitionId: 0,
    isHandoff: false,
  });
  const measurementRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const animatedWidth = useMotionValue<number | "auto">("auto");
  const hasMeasuredWidth = useRef(false);
  const text = texts[rotation.index] ?? "";
  const [widthX1, widthY1, widthX2, widthY2] = widthTransition;

  useLayoutEffect(() => {
    const element = measurementRefs.current[rotation.index];
    if (!element) return;

    let widthAnimation: ReturnType<typeof animate> | undefined;

    const updateWidth = () => {
      const width = element.getBoundingClientRect().width;
      if (width <= 0) return;

      if (!hasMeasuredWidth.current) {
        animatedWidth.set(width);
        hasMeasuredWidth.current = true;
        return;
      }

      widthAnimation?.stop();
      widthAnimation = animate(animatedWidth, width, {
        duration: animationDuration,
        ease: [widthX1, widthY1, widthX2, widthY2],
      });
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => {
      observer.disconnect();
      widthAnimation?.stop();
    };
  }, [
    animatedWidth,
    animationDuration,
    rotation.index,
    text,
    widthX1,
    widthX2,
    widthY1,
    widthY2,
  ]);

  useEffect(() => {
    if (texts.length <= 1) return;

    let handoffTimeout: ReturnType<typeof setTimeout>;
    let firstHandoffFrame = 0;
    let cleanupFrame = 0;

    const runTransition = () => {
      setRotation((current) => ({
        index: (current.index + 1) % texts.length,
        outgoingIndex: current.index,
        transitionId: current.transitionId + 1,
        isHandoff: false,
      }));

      handoffTimeout = setTimeout(() => {
        setRotation((current) => ({ ...current, isHandoff: true }));

        firstHandoffFrame = requestAnimationFrame(() => {
          cleanupFrame = requestAnimationFrame(() => {
            setRotation((current) => ({
              ...current,
              outgoingIndex: null,
              isHandoff: false,
            }));
          });
        });
      }, animationDuration * 1000);
    };

    const transitionCleanupMs = animationDuration * 1000 + 1000 / 30;
    const interval = setInterval(
      runTransition,
      Math.max(duration * 1000, transitionCleanupMs),
    );

    return () => {
      clearInterval(interval);
      clearTimeout(handoffTimeout);
      cancelAnimationFrame(firstHandoffFrame);
      cancelAnimationFrame(cleanupFrame);
    };
  }, [texts.length, duration, animationDuration]);

  useEffect(() => {
    setRotation((current) => {
      const index = texts.length === 0 ? 0 : current.index % texts.length;
      const shouldResetTransition =
        texts.length <= 1 ||
        index !== current.index ||
        (current.outgoingIndex !== null &&
          current.outgoingIndex >= texts.length);

      if (
        index === current.index &&
        !shouldResetTransition &&
        current.isHandoff === false
      ) {
        return current;
      }

      return {
        ...current,
        index,
        outgoingIndex: shouldResetTransition ? null : current.outgoingIndex,
        isHandoff: false,
      };
    });
  }, [texts.length]);

  const incomingDelay = animationDuration * INCOMING_DELAY_RATIO;
  const maskAnimationDuration = animationDuration - incomingDelay;
  const outgoingText =
    rotation.outgoingIndex === null
      ? null
      : (texts[rotation.outgoingIndex] ?? "");
  const isTransitioning = outgoingText !== null;

  return (
    <motion.span
      aria-label={text}
      aria-live="polite"
      className={cn(
        "relative inline-block min-w-0 align-bottom will-change-[width]",
        className,
      )}
      style={{ width: animatedWidth }}
    >
      {texts.map((candidate, candidateIndex) => (
        <span
          key={`${candidateIndex}-${candidate}`}
          ref={(element) => {
            measurementRefs.current[candidateIndex] = element;
          }}
          aria-hidden="true"
          className="pointer-events-none invisible absolute inline-block whitespace-nowrap"
        >
          {candidate}
        </span>
      ))}
      <span aria-hidden="true" className="invisible whitespace-nowrap">
        {text}
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 flex whitespace-nowrap",
          alignmentClassName,
          textClassName,
        )}
        style={{
          opacity: !isTransitioning || rotation.isHandoff ? 1 : 0,
        }}
      >
        {text}
      </span>

      {isTransitioning && (
        <PixelTransitionCanvas
          key={rotation.transitionId}
          outgoingText={outgoingText}
          incomingText={text}
          animationDuration={maskAnimationDuration}
          incomingDelay={incomingDelay}
          alignmentClassName={alignmentClassName}
          textClassName={textClassName}
        />
      )}
    </motion.span>
  );
}
