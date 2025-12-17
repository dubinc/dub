import { PartnerRewindProps } from "@/lib/types";
import {
  AnimatedSizeContainer,
  ChevronLeft,
  ChevronRight,
  ReferredVia,
} from "@dub/ui";
import { cn } from "@dub/utils/src";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "motion/react";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import {
  REWIND_ASSETS_PATH,
  REWIND_PERCENTILES,
  REWIND_STEPS,
} from "../../../../../../ui/partners/rewind/constants";
import { useShareRewindModal } from "./share-rewind-modal";

const STEP_DELAY_MS = 8_000;

export const navButtonClassName =
  "bg-neutral-200 text-content-subtle disabled:opacity-50 hover:bg-neutral-300 ease-out flex size-8 items-center text-sm font-medium gap-2 justify-center rounded-lg transition-[background-color,transform] active:scale-95";

export function Rewind({
  partnerRewind,
  onComplete,
}: {
  partnerRewind: PartnerRewindProps;
  onComplete: () => void;
}) {
  const steps = useMemo(
    () =>
      REWIND_STEPS.map((step) =>
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
      onComplete();
      return;
    }

    if (isPaused) return;

    const timeout = setTimeout(() => {
      setCurrentStepIndex((i) => i + 1);
    }, STEP_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [steps, currentStepIndex, isPaused, onComplete]);

  const { ShareRewindModal, setShowShareRewindModal } = useShareRewindModal({
    rewindId: partnerRewind.id,
    step: steps[Math.min(currentStepIndex, steps.length - 1)].id,
  });

  return (
    <div className="flex w-full flex-col items-center">
      <ShareRewindModal />
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

      <AnimatedSizeContainer
        height
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="!w-full"
      >
        <AnimatePresence mode="wait">
          {currentStepIndex < steps.length && (
            <motion.div
              key={currentStepIndex}
              initial={{ opacity: 0, scale: 0.9, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.9, y: 20, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
              className="flex w-full flex-col items-center py-6"
            >
              <StepSlide {...steps[currentStepIndex]} />
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatedSizeContainer>

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
          <ChevronLeft className="size-3 [&_*]:stroke-2" />
        </button>
        <button
          type="button"
          onClick={() => {
            setIsPaused(true);
            setShowShareRewindModal(true);
          }}
          className={cn(navButtonClassName, "text-content-emphasis w-fit px-3")}
        >
          Share
          <ReferredVia className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setIsPaused(false);
            if (currentStepIndex < steps.length - 1)
              setCurrentStepIndex((c) => Math.min(c + 1, steps.length - 1));
            else onComplete();
          }}
          className={navButtonClassName}
        >
          <ChevronRight className="size-3 [&_*]:stroke-2" />
        </button>
      </div>
    </div>
  );
}

function StepSlide({
  label,
  value: rawValue,
  valueType,
  percentile,
  video,
}: {
  label: string;
  value: number;
  valueType: "number" | "currency";
  percentile: number;
  video: string;
}) {
  const value =
    valueType === "currency"
      ? Math.floor(rawValue / 100)
      : Math.floor(rawValue);

  const [animatedValue, setAnimatedValue] = useState<number>(0);
  useEffect(() => setAnimatedValue(value), [value]);

  const percentileLabel = REWIND_PERCENTILES.find(
    ({ minPercentile }) => percentile >= minPercentile,
  )?.label;

  return (
    <div className="bg-bg-default border-border-subtle flex w-full max-w-screen-sm flex-col rounded-2xl border p-6 drop-shadow-sm sm:p-10">
      <div className="flex grow flex-col">
        <span className="text-content-emphasis text-lg font-semibold">
          {label}
        </span>

        <div className="pt-2">
          <NumberFlow
            value={animatedValue}
            className="text-content-emphasis my-[-0.1em] text-5xl font-bold sm:text-8xl"
            style={{ "--number-flow-mask-height": "0.1em" } as CSSProperties}
            trend={1}
            format={{
              ...(valueType === "currency" && {
                style: "currency",
                currency: "USD",
                // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                trailingZeroDisplay: "stripIfInteger",
              }),
              ...(animatedValue > 9999999 && {
                notation: "compact",
              }),
            }}
            continuous
          />
        </div>

        <div
          className={cn(
            "mt-5 flex items-center gap-2.5",
            percentileLabel
              ? "animate-slide-up-fade [--offset:10px] [animation-delay:0.2s] [animation-duration:1.5s] [animation-fill-mode:both]"
              : "opacity-0",
          )}
          inert={!percentileLabel}
        >
          <img
            src={`${REWIND_ASSETS_PATH}/top-medallion.png`}
            alt=""
            className="size-6 drop-shadow-sm"
          />
          <span className="text-content-emphasis text-base font-semibold">
            {percentileLabel} of all partners
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <span className="text-content-emphasis font-display max-w-[180px] text-2xl font-bold leading-8 sm:text-3xl">
          Dub Partner Rewind &rsquo;25
        </span>

        <div className="-mb-3 -mr-2 -mt-16 h-[260px] grow sm:-mb-6 sm:-mr-8 sm:h-[340px]">
          <video
            src={`${REWIND_ASSETS_PATH}/${video}`}
            autoPlay
            playsInline
            muted
            loop
            className="size-full object-contain object-right-bottom"
          />
        </div>
      </div>
    </div>
  );
}
