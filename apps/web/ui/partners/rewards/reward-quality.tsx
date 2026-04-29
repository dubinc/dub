"use client";

import type { EventType, RewardStructure } from "@dub/prisma/client";
import { Tooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";

export type RewardQuality = "low" | "good" | "strong" | "limited";

export const getRewardQuality = ({
  event,
  type,
  amountInCents,
  amountInPercentage,
  maxDuration,
}: {
  event: EventType;
  type: RewardStructure | null | undefined;
  amountInCents?: number | null;
  amountInPercentage?: number | null;
  maxDuration?: number | null;
}): RewardQuality | null => {
  if (event === "click" || event === "lead") {
    if (amountInCents == null || Number.isNaN(amountInCents)) {
      return null;
    }

    const amount = amountInCents / 100;

    if (event === "click") {
      if (amount < 0.03) return "low";
      if (amount <= 0.05) return "good";
      return "strong";
    }

    if (amount < 1) return "low";
    if (amount <= 10) return "good";
    return "strong";
  }

  if (event !== "sale" || !type) {
    return null;
  }

  const isOneOff = maxDuration === 0;
  const isLifetime = maxDuration == null || maxDuration === Infinity;
  const months = isLifetime ? Infinity : maxDuration;

  if (type === "percentage") {
    if (amountInPercentage == null || Number.isNaN(amountInPercentage)) {
      return null;
    }

    if (isOneOff) {
      return "limited";
    }

    if (amountInPercentage < 10 || (months ?? 0) < 6) {
      return "low";
    }

    if (
      amountInPercentage > 20 &&
      (isLifetime || (months != null && months >= 12))
    ) {
      return "strong";
    }

    return "good";
  }

  if (amountInCents == null || Number.isNaN(amountInCents)) {
    return null;
  }

  if (isOneOff) {
    if (amountInCents >= 100_00) {
      return "strong";
    }

    if (amountInCents >= 50_00) {
      return "good";
    }

    return "limited";
  }

  const totalCents = isLifetime ? Infinity : amountInCents * (months ?? 0);

  if (totalCents < 50_00 || (months ?? 0) < 6) {
    return "low";
  }

  if (totalCents > 100_00 && (isLifetime || (months != null && months >= 12))) {
    return "strong";
  }

  return "good";
};

const QUALITY_STYLES: Record<
  RewardQuality,
  {
    label: string;
    bgClassName: string;
    textClassName: string;
    iconClassName: string;
    activeBars: number;
  }
> = {
  low: {
    label: "Low",
    bgClassName: "bg-orange-100",
    textClassName: "text-orange-700",
    iconClassName: "bg-orange-500",
    activeBars: 1,
  },
  good: {
    label: "Good",
    bgClassName: "bg-cyan-200",
    textClassName: "text-cyan-700",
    iconClassName: "bg-cyan-500",
    activeBars: 2,
  },
  strong: {
    label: "Strong",
    bgClassName: "bg-green-200",
    textClassName: "text-green-700",
    iconClassName: "bg-green-500",
    activeBars: 3,
  },
  limited: {
    label: "Limited",
    bgClassName: "bg-orange-100",
    textClassName: "text-orange-700",
    iconClassName: "bg-orange-500",
    activeBars: 1,
  },
};

function QualityBars({
  quality,
  className,
}: {
  quality: RewardQuality | null;
  className?: string;
}) {
  const styles = quality ? QUALITY_STYLES[quality] : null;
  const isEmpty = !quality;

  return (
    <span
      className={cn(
        "flex h-3 w-3 items-center justify-center gap-0.5",
        className,
      )}
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          style={{ transitionDelay: `${index * 35}ms` }}
          className={cn(
            "h-2 w-0.5 rounded-full transition-[background-color,opacity] duration-300 ease-out",
            styles ? styles.iconClassName : "bg-neutral-700",
            styles && index >= styles.activeBars && "opacity-30",
            !styles && "opacity-30",
          )}
        />
      ))}
    </span>
  );
}

function RewardQualityTooltipContent({
  event,
  quality,
  footer,
}: {
  event?: EventType;
  quality: RewardQuality | null;
  footer?: string;
}) {
  const styles = quality ? QUALITY_STYLES[quality] : null;
  const content = getRewardQualityTooltipCopy({ event, quality });

  return (
    <div className="w-[220px] overflow-hidden rounded-xl bg-white text-left">
      <div
        className={cn(
          "m-1 flex h-5 items-center rounded-md p-1 px-2",
          styles?.bgClassName ?? "bg-neutral-200",
        )}
      >
        <QualityBars quality={quality} />
        {styles && (
          <span
            className={cn("ml-1.5 text-xs font-semibold", styles.textClassName)}
          >
            {styles.label}
          </span>
        )}
      </div>

      <div className="px-2.5 pb-2 pt-1 text-xs">
        <div className="font-semibold text-neutral-900">{content.title}</div>
        {content.description && (
          <div className="mt-2 text-neutral-600">{content.description}</div>
        )}
        {content.bullets?.length ? (
          <ul className="mt-2 list-disc pl-4 text-neutral-600">
            {content.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {footer && (
        <div className="mx-1.5 mb-1.5 rounded-md bg-neutral-100 px-3 py-1.5 text-center text-xs font-medium text-neutral-500">
          {footer}
        </div>
      )}
    </div>
  );
}

function getRewardQualityTooltipCopy({
  event,
  quality,
}: {
  event?: EventType;
  quality: RewardQuality | null;
}) {
  if (!quality) {
    return {
      title: "Reward quality",
      description:
        event === "click" || event === "lead"
          ? "Set amount to evaluate this reward"
          : "Set amount and duration to evaluate this reward",
    };
  }

  if (quality === "low") {
    return {
      title: "May struggle to attract partners",
      bullets: ["Below typical ranges", "Limited earning potential"],
    };
  }

  if (quality === "limited") {
    return {
      title: "May struggle to attract partners",
      bullets: ["One time reward only", "No long term earning potential"],
    };
  }

  if (quality === "good") {
    return {
      title: "Solid reward with room to grow",
      bullets: [
        "Meets minimum partner expectations",
        "Opportunity to increase earning potential",
      ],
    };
  }

  return {
    title: "High earning potential for partners",
    bullets:
      event === "sale"
        ? ["Competitive reward level", "Continued earning after the first sale"]
        : ["Competitive reward level", "Consistent earning potential"],
  };
}

export function RewardQualityIndicator({
  quality,
  event,
  tooltipFooter,
  showLabel = true,
  className,
}: {
  quality: RewardQuality | null;
  event?: EventType;
  tooltipFooter?: string;
  showLabel?: boolean;
  className?: string;
}) {
  const styles = quality ? QUALITY_STYLES[quality] : null;
  const isEmpty = !quality;

  return (
    <Tooltip
      content={
        <RewardQualityTooltipContent
          event={event}
          footer={tooltipFooter}
          quality={quality}
        />
      }
      side="top"
      contentClassName="p-0"
    >
      <button
        type="button"
        className={cn(
          "flex h-5 cursor-help items-center justify-center gap-1.5 rounded-md px-1.5 text-xs font-semibold leading-4 outline-none transition-colors",
          "duration-300 ease-out",
          isEmpty && "w-5 bg-neutral-200 p-0 text-neutral-400",
          !isEmpty && styles?.bgClassName,
          !isEmpty && styles?.textClassName,
          className,
        )}
        aria-label={
          quality
            ? `Reward quality: ${styles?.label}`
            : "Reward quality thresholds"
        }
      >
        <QualityBars quality={quality} />
        <AnimatePresence mode="popLayout" initial={false}>
          {showLabel && styles?.label && (
            <motion.span
              key={styles.label}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="inline-block"
            >
              {styles.label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </Tooltip>
  );
}

export function RewardQualityFieldIndicator({
  event,
  type,
  amountInCents,
  amountInPercentage,
  maxDuration,
}: {
  event: EventType;
  type: RewardStructure | null | undefined;
  amountInCents?: number | null;
  amountInPercentage?: number | null;
  maxDuration?: number | null;
}) {
  const quality = getRewardQuality({
    event,
    type,
    amountInCents,
    amountInPercentage,
    maxDuration,
  });

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-neutral-500">
        Reward quality
      </span>
      <RewardQualityIndicator event={event} quality={quality} />
    </div>
  );
}
