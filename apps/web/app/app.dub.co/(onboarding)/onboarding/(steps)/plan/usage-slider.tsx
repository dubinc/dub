"use client";

// Mirrors the marketing pricing page (dub.co app/(site)/pricing/usage-slider.tsx)

import { cn } from "@dub/utils";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { PricingContext, UsageMetric, UsageTier } from "./pricing-context";

// Pixels of drag past the last tier to reach the max amount, plus a little
// more to reach ∞
const OVERFLOW_DRAG_PX = 980;
const OVERFLOW_INFINITY_PX = 20;

// Tick rows inset by 12px, with one tick group per plan separated by `--gap`
const TICK_INSET = 12;
// Center of the first and last 1px ticks
const LINE_INSET = TICK_INSET + 0.5;
const THUMB_SIZE = 18;

// The thumb trails its target on a spring so it feels weighted, stretches
// along its direction of travel with speed, and squishes while pressed
const THUMB_SPRING = {
  type: "spring",
  stiffness: 420,
  damping: 30,
  mass: 0.9,
} as const;
const PRESS_SPRING = { stiffness: 600, damping: 26 };
const STRETCH_SPEED = 2400; // px/s for the full stretch
const MAX_STRETCH = 0.3;
const MAX_SQUASH = 0.16;
const PRESS_SQUISH = 0.07;

// Groups spread their ticks edge to edge; single-tick groups pin it to the end
const tickFraction = ({ index, count }: UsageTier) =>
  count === 1 ? 1 : index / (count - 1);

export function UsageSlider({
  metric,
  planIndex,
  valueText,
  className,
  style,
}: {
  metric: UsageMetric;
  // Limits the slider to a single plan's tiers; all plans when omitted
  planIndex?: number;
  valueText: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { usage, setUsage } = useContext(PricingContext);
  const { tierIndex, overflow } = usage[metric.id];

  const trackRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Overflow is measured from an anchor so a new drag can continue from the
  // current amount; `held` is the highest amount reached during the drag
  const drag = useRef<{
    anchorX: number;
    anchorDistance: number;
    held: number;
  } | null>(null);

  const lastTierIndex = metric.tiers.length - 1;
  const planCount = metric.tiers[lastTierIndex].planIndex + 1;
  const planIndexes =
    planIndex === undefined
      ? Array.from({ length: planCount }, (_, index) => index)
      : [planIndex];

  // Tiers on this slider, keyed by their index across all plans
  const tiers = metric.tiers
    .map((tier, index) => ({ tier, index }))
    .filter(({ tier }) => planIndexes.includes(tier.planIndex));
  const firstIndex = tiers[0].index;
  const lastIndex = tiers[tiers.length - 1].index;

  // Only the open-ended last tier keeps counting once the thumb hits the end
  const canOverflow = lastIndex === lastTierIndex;

  const {
    overflowFromDrag,
    dragForOverflow,
    stepOverflow,
    step: overflowStep,
  } = overflowMath(metric);

  // Center of a tier's tick, matching the flex layout of the tick row
  const tierOffset = (width: number, gap: number, tier: UsageTier) => {
    const groupWidth =
      (width - 2 * TICK_INSET - (planIndexes.length - 1) * gap) /
      planIndexes.length;

    return (
      TICK_INSET +
      planIndexes.indexOf(tier.planIndex) * (groupWidth + gap) +
      tickFraction(tier) * (groupWidth - 1) +
      0.5
    );
  };

  // Used until the track is measured, so the server render is positioned too
  const tierOffsetCss = (tier: UsageTier) =>
    `calc(${TICK_INSET}px + ${planIndexes.indexOf(tier.planIndex)} * (var(--group-width) + var(--gap)) + ${tickFraction(tier)} * (var(--group-width) - 1px) + 0.5px)`;

  const [track, setTrack] = useState<{ width: number; gap: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const element = trackRef.current;
    if (!element) return;

    const measure = () =>
      setTrack({
        width: element.getBoundingClientRect().width,
        gap: parseFloat(getComputedStyle(element).getPropertyValue("--gap")),
      });

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Thumb position in px, sprung toward the selected tick
  const position = useMotionValue(0);
  const target = track
    ? tierOffset(track.width, track.gap, metric.tiers[tierIndex])
    : null;
  const lastTrack = useRef(track);

  useLayoutEffect(() => {
    if (target === null) return;

    // Jump on first measure and resizes; only selection changes animate
    if (shouldReduceMotion || lastTrack.current !== track)
      position.jump(target);
    else animate(position, target, THUMB_SPRING);

    lastTrack.current = track;
  }, [target, track, position, shouldReduceMotion]);

  const velocity = useVelocity(position);
  const pressed = useSpring(0, PRESS_SPRING);

  const speed = (v: number) =>
    shouldReduceMotion ? 0 : Math.min(Math.abs(v) / STRETCH_SPEED, 1);

  const scaleX = useTransform(
    [velocity, pressed],
    ([v, p]: number[]) => (1 + speed(v) * MAX_STRETCH) * (1 + p * PRESS_SQUISH),
  );
  const scaleY = useTransform(
    [velocity, pressed],
    ([v, p]: number[]) => (1 - speed(v) * MAX_SQUASH) * (1 - p * PRESS_SQUISH),
  );
  const fillWidth = useTransform(position, (x) => x - LINE_INSET);

  const update = (tier: number, nextOverflow = 0) => {
    if (tier !== tierIndex || nextOverflow !== overflow)
      setUsage(metric.id, tier, nextOverflow);
  };

  const updateFromPointer = (clientX: number, start = false) => {
    const element = trackRef.current;
    if (!element) return;

    const { left, width } = element.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(element).getPropertyValue("--gap"));
    const x = clientX - left;
    const offsets = tiers.map(({ tier }) => tierOffset(width, gap, tier));
    const lastOffset = offsets[offsets.length - 1];
    const previousOffset = offsets[offsets.length - 2] ?? -Infinity;
    const fresh = { anchorX: lastOffset, anchorDistance: 0, held: 0 };

    if (start) {
      // Grabbing the thumb while it's past the end continues from that amount
      if (canOverflow && overflow > 0 && x > previousOffset) {
        drag.current = {
          anchorX: x,
          anchorDistance: dragForOverflow(overflow),
          held: overflow,
        };
        return;
      }
      drag.current = fresh;
    }

    const { anchorX, anchorDistance, held } = drag.current ?? fresh;

    // Past the last tick, keep raising the amount instead of moving the thumb.
    // Dragging back holds the amount until the pointer reaches the previous dash
    if (canOverflow && (x > lastOffset || (held > 0 && x > previousOffset))) {
      const amount = Math.max(
        held,
        overflowFromDrag(anchorDistance + x - anchorX),
      );
      drag.current = { anchorX, anchorDistance, held: amount };
      update(lastIndex, amount);
      return;
    }

    drag.current = fresh;

    const nearest = offsets.reduce(
      (best, offset, index) =>
        Math.abs(offset - x) < Math.abs(offsets[best] - x) ? index : best,
      0,
    );
    update(tiers[nearest].index);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pressed.set(1);
    updateFromPointer(e.clientX, true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) updateFromPointer(e.clientX);
  };

  const onPointerUp = () => {
    drag.current = null;
    pressed.set(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Shift and Page Up/Down take bigger steps past the last tier
    const step =
      e.shiftKey || e.key.startsWith("Page") ? overflowStep * 10 : overflowStep;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
      case "PageUp":
        if (tierIndex < lastIndex) update(tierIndex + 1);
        else if (canOverflow) update(tierIndex, stepOverflow(overflow, step));
        break;
      case "ArrowLeft":
      case "ArrowDown":
      case "PageDown":
        if (overflow > 0) update(tierIndex, stepOverflow(overflow, -step));
        else update(Math.max(tierIndex - 1, firstIndex));
        break;
      case "Home":
        update(firstIndex);
        break;
      case "End":
        update(lastIndex);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const thumbOffset = tierOffsetCss(metric.tiers[tierIndex]);

  return (
    <div
      className={cn(
        "flex cursor-pointer touch-pan-y select-none flex-col gap-4 p-3",
        "[--gap:16px] lg:[--gap:60px]",
        className,
      )}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        ref={trackRef}
        className="relative h-0.5"
        style={
          {
            "--group-width": `calc((100% - ${2 * TICK_INSET}px - ${planIndexes.length - 1} * var(--gap)) / ${planIndexes.length})`,
          } as CSSProperties
        }
      >
        {/* The line runs between the first and last tick centers, so the thumb
            covers its ends at either extreme */}
        <div
          className="absolute inset-y-0 rounded-full bg-neutral-200"
          style={{ left: LINE_INSET, right: LINE_INSET }}
        />
        <motion.div
          className="absolute inset-y-0 rounded-full bg-neutral-800"
          style={{
            left: LINE_INSET,
            width: track ? fillWidth : `calc(${thumbOffset} - ${LINE_INSET}px)`,
          }}
        />
        <motion.div
          role="slider"
          tabIndex={0}
          aria-label={metric.label.replace("/", " per ")}
          aria-valuemin={firstIndex}
          aria-valuemax={lastIndex + (canOverflow ? 1 : 0)}
          aria-valuenow={tierIndex + (overflow > 0 ? 1 : 0)}
          aria-valuetext={valueText}
          onKeyDown={onKeyDown}
          className="absolute top-1/2 cursor-grab rounded-full bg-neutral-800 shadow-[0_1px_2px_0_rgba(0,0,0,0.12)] outline-none ring-neutral-300 ring-offset-2 ring-offset-neutral-50 focus-visible:ring-2 active:cursor-grabbing"
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            marginLeft: -THUMB_SIZE / 2,
            marginTop: -THUMB_SIZE / 2,
            left: track ? 0 : thumbOffset,
            x: track ? position : 0,
            scaleX,
            scaleY,
          }}
        />
      </div>

      {/* Fixed to the tallest tick so resizing ticks never shift the content below */}
      <div className="flex h-2.5 items-start gap-[var(--gap)] px-3" aria-hidden>
        {planIndexes.map((planIndex) => (
          <div
            key={planIndex}
            className="flex flex-1 items-start justify-between [&>:only-child]:ml-auto"
          >
            {tiers.map(({ tier, index }) =>
              tier.planIndex === planIndex ? (
                <div
                  key={index}
                  className={cn(
                    "w-px transition-[height,background-color] duration-150 ease-out motion-reduce:transition-none",
                    index <= tierIndex ? "bg-neutral-800" : "bg-neutral-300",
                    // The selected tick is tallest and its neighbors step down,
                    // so the tick row slopes toward the thumb
                    {
                      0: "h-2.5",
                      1: "h-2",
                    }[Math.abs(index - tierIndex)] ?? "h-1.5",
                  )}
                />
              ) : null,
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Amounts past the last tier, which is open-ended
function overflowMath({ tiers, overflow }: UsageMetric) {
  const base = tiers[tiers.length - 1].value;
  const { step, max } = overflow;

  const roundToStep = (amount: number) => Math.round(amount / step) * step;

  return {
    step,

    // Grows exponentially with the drag distance, so the first pixels move in
    // single steps and the far end covers the rest of the range in bigger jumps
    overflowFromDrag: (distance: number) => {
      if (distance > OVERFLOW_DRAG_PX + OVERFLOW_INFINITY_PX) return Infinity;

      const progress = Math.min(distance / OVERFLOW_DRAG_PX, 1);
      const amount = roundToStep(base * (max / base) ** progress);

      return amount > base ? amount : 0;
    },

    // Inverse of `overflowFromDrag`, to pick up a drag from the current amount
    dragForOverflow: (amount: number) => {
      if (amount === Infinity)
        return OVERFLOW_DRAG_PX + OVERFLOW_INFINITY_PX + 1;
      if (amount <= base) return 0;

      return (
        (OVERFLOW_DRAG_PX * Math.log(amount / base)) / Math.log(max / base)
      );
    },

    stepOverflow: (amount: number, delta: number) => {
      if (delta > 0) {
        if (amount >= max) return Infinity;
        return Math.min((amount || base) + delta, max);
      }

      if (amount === Infinity) return max;
      const next = amount + delta;
      return next > base ? next : 0;
    },
  };
}
