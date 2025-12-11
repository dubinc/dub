import { PartnerRewindProps } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

const ASSETS_PATH = "https://assets.dub.co/misc/partner-rewind-2025";

const STEPS = [
  {
    id: "totalEarnings",
    percentileId: "earningsPercentile",
    label: "Total earnings",
    valueType: "currency",
    video: "revenue.webm",
  },
  {
    id: "totalClicks",
    percentileId: "clicksPercentile",
    label: "Total clicks",
    valueType: "number",
    video: "clicks.webm",
  },
  {
    id: "totalLeads",
    percentileId: "leadsPercentile",
    label: "Total leads",
    valueType: "number",
    video: "leads.webm",
  },
  {
    id: "totalRevenue",
    percentileId: "revenuePercentile",
    label: "Total revenue",
    valueType: "currency",
    video: "revenue.webm",
  },
];

const STEP_DELAY_MS = 2000;

const navButtonClassName =
  "bg-bg-inverted/5 text-content-default hover:bg-bg-inverted/10 flex size-8 items-center justify-center rounded-lg transition-[background-color,transform] active:scale-95";

export function Rewind({
  partnerRewind,
  onComplete,
}: {
  partnerRewind: PartnerRewindProps;
  onComplete: () => void;
}) {
  const steps = useMemo(
    () =>
      STEPS.map((step) =>
        partnerRewind[step.id]
          ? {
              ...step,
              value: partnerRewind[step.id],
              percentile: partnerRewind[step.percentileId],
            }
          : null,
      ).filter((s): s is NonNullable<typeof s> => s !== null),
    [partnerRewind],
  );

  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (currentStepIndex > steps.length - 1) {
      setCurrentStepIndex(steps.length - 1);
      return;
    }

    if (isPaused || currentStepIndex === steps.length - 1) return;

    const timeout = setTimeout(() => {
      setCurrentStepIndex((i) => i + 1);
    }, STEP_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [steps, currentStepIndex, isPaused]);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex items-center gap-0.5">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => {
              setIsPaused(true);
              setCurrentStepIndex(index);
            }}
            className="rounded-full p-1 transition-all hover:bg-black/5 active:scale-95"
          >
            <div className="bg-bg-emphasis relative h-1.5 w-10 overflow-hidden rounded-full">
              {index === currentStepIndex && !isPaused ? (
                <motion.div
                  className="bg-bg-inverted absolute inset-0 rounded-full"
                  initial={{ x: "-100%", opacity: 0.3 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{
                    duration: STEP_DELAY_MS / 1000,
                    ease: "linear",
                  }}
                />
              ) : (
                <div
                  className={cn(
                    "bg-bg-inverted size-full rounded-full transition-opacity",
                    index > currentStepIndex && "opacity-0",
                  )}
                />
              )}
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
          transition={{ duration: 0.5 }}
          className="flex w-full flex-col items-center"
        >
          <StepSlide title={steps[currentStepIndex].label} />
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setIsPaused(false);
            setCurrentStepIndex((c) => Math.max(c - 1, 0));
          }}
          disabled={currentStepIndex <= 0}
          className={navButtonClassName}
        >
          <ChevronLeft className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            setIsPaused(false);
            setCurrentStepIndex((c) => Math.min(c + 1, steps.length - 1));
          }}
          disabled={currentStepIndex >= steps.length - 1}
          className={navButtonClassName}
        >
          <ChevronRight className="size-3" />
        </button>
      </div>
    </div>
  );
}

function StepSlide({
  title,
  onPrevious,
  onNext,
}: {
  title: string;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="bg-bg-default border-border-subtle flex w-full max-w-screen-sm flex-col rounded-2xl border p-10">
      <div>{title}</div>
    </div>
  );
}
