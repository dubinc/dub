"use client";

import {
  AIRewardDraft,
  AIRewardGenerationOutput,
  getAIRewardSchema,
} from "@/lib/ai/ai-reward-schema";
import { generateReward } from "@/lib/ai/generate-reward";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import { REWARD_CONDITION_ATTRIBUTES } from "@/lib/zod/schemas/rewards";
import { readStreamableValue } from "@ai-sdk/rsc";
import { AnimatedSizeContainer, Button, TooltipContent } from "@dub/ui";
import { ArrowTurnRight2, Sparkle3 } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { EventType, RewardStructure } from "@prisma/client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
  type TransitionEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { REWARD_PRESETS } from "./reward-presets";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EASE_OUT_CSS = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_CHROME = "cubic-bezier(0.32, 0.72, 0, 1)";
const CHROME_ENTER_MS = 240;

type BuilderPhase = "idle" | "streaming" | "review" | "error";

function buildRewardFormValuesFromDraft({
  draft,
  event,
  current,
  finalize = false,
}: {
  draft: AIRewardDraft | Partial<AIRewardDraft>;
  event: Exclude<EventType, "referral">;
  current: Record<string, unknown>;
  finalize?: boolean;
}): Record<string, unknown> | null {
  if (draft.type == null || draft.amount == null) return null;

  const isOneOffEvent = event === "click" || event === "lead";
  const type: RewardStructure = isOneOffEvent ? "flat" : draft.type;
  const maxDuration = isOneOffEvent
    ? 0
    : draft.maxDuration === undefined
      ? undefined
      : draft.maxDuration == null
        ? Infinity
        : draft.maxDuration;

  const next: Record<string, unknown> = {
    ...current,
    type,
  };

  if (type === "flat") {
    next.amountInCents = draft.amount;
    next.amountInPercentage = undefined;
  } else {
    next.amountInPercentage = draft.amount;
    next.amountInCents = undefined;
  }

  if (maxDuration !== undefined) {
    next.maxDuration = maxDuration;
  }

  const modifiers = draft.modifiers?.filter((m) => m.conditions?.length);
  if (!modifiers?.length) {
    // Only clear stale conditions on the final draft so partial streams do not wipe them.
    if (finalize) {
      next.modifiers = undefined;
    }
    return next;
  }

  const resolvedMaxDuration =
    maxDuration === undefined ? (isOneOffEvent ? 0 : Infinity) : maxDuration;

  next.modifiers = modifiers.map((modifier) => {
    const modifierType = modifier.type === undefined ? type : modifier.type;
    const modifierAmount = modifier.amount ?? draft.amount;
    const modifierMaxDuration =
      modifier.maxDuration === undefined
        ? resolvedMaxDuration
        : modifier.maxDuration == null
          ? Infinity
          : modifier.maxDuration;

    return {
      id: uuid(),
      operator: modifier.operator ?? "AND",
      conditions: modifier.conditions.map((condition) => {
        const value = condition.value;
        const attrType = REWARD_CONDITION_ATTRIBUTES.find(
          (a) => a.id === condition.attribute,
        )?.type;

        if (attrType !== "date" || value == null || Array.isArray(value)) {
          return condition;
        }

        const ms =
          typeof value === "number" ? value : Number(new Date(String(value)));

        return {
          ...condition,
          value: Number.isNaN(ms) ? value : ms,
        };
      }),
      type: modifierType,
      amountInCents: modifierType === "flat" ? modifierAmount : undefined,
      amountInPercentage:
        modifierType === "percentage" ? modifierAmount : undefined,
      maxDuration: event === "sale" ? modifierMaxDuration : undefined,
    };
  });

  return next;
}

export function useAIRewardBuilder({
  event,
  getValues,
  reset,
}: {
  event: Exclude<EventType, "referral">;
  getValues: () => Record<string, unknown>;
  reset: (
    values: Record<string, unknown>,
    options?: { keepDefaultValues?: boolean },
  ) => void;
}) {
  const {
    id: workspaceId,
    slug: workspaceSlug,
    plan,
    mutate: mutateWorkspace,
  } = useWorkspace();
  const { canUseAdvancedRewardLogic } = getPlanCapabilities(plan);

  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<BuilderPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hasPreviewContent, setHasPreviewContent] = useState(false);
  const snapshotRef = useRef<Record<string, unknown> | null>(null);
  const presetTimeoutRef = useRef<number | null>(null);
  const generationIdRef = useRef(0);
  const streamingRef = useRef(false);

  const presets = REWARD_PRESETS[event] ?? [];
  const isReviewing =
    phase === "streaming" || phase === "review" || phase === "error";

  const clearPresetTimeout = useCallback(() => {
    if (presetTimeoutRef.current != null) {
      window.clearTimeout(presetTimeoutRef.current);
      presetTimeoutRef.current = null;
    }
  }, []);

  const ensureSnapshot = useCallback(() => {
    if (!snapshotRef.current) {
      snapshotRef.current = structuredClone(getValues());
    }
  }, [getValues]);

  const applyDraft = useCallback(
    (
      draft: AIRewardDraft | Partial<AIRewardDraft>,
      finalize: boolean = false,
    ) => {
      const next = buildRewardFormValuesFromDraft({
        draft,
        event,
        current: getValues(),
        finalize,
      });
      if (!next) return;
      reset(next, { keepDefaultValues: true });
      setHasPreviewContent(true);
    },
    [event, getValues, reset],
  );

  const exitReview = useCallback(() => {
    clearPresetTimeout();
    generationIdRef.current += 1;
    streamingRef.current = false;
    snapshotRef.current = null;
    setHasPreviewContent(false);
    setPhase("idle");
    setError(null);
  }, [clearPresetTimeout]);

  const discard = useCallback(
    ({ keepPrompt = false }: { keepPrompt?: boolean } = {}) => {
      if (snapshotRef.current) {
        reset(snapshotRef.current, { keepDefaultValues: true });
      }
      exitReview();
      if (!keepPrompt) {
        setPrompt("");
      }
    },
    [exitReview, reset],
  );

  const accept = useCallback(() => {
    exitReview();
    setPrompt("");
    toast.success("Reward applied — review and save when ready.");
  }, [exitReview]);

  const selectPreset = useCallback(
    (draft: AIRewardDraft) => {
      if (!canUseAdvancedRewardLogic || streamingRef.current) return;

      clearPresetTimeout();
      const generationId = ++generationIdRef.current;
      streamingRef.current = true;
      ensureSnapshot();
      setPrompt("");
      setHasPreviewContent(false);
      setPhase("streaming");
      setError(null);

      presetTimeoutRef.current = window.setTimeout(() => {
        presetTimeoutRef.current = null;
        if (generationId !== generationIdRef.current) return;
        applyDraft(draft, true);
        setPhase("review");
        streamingRef.current = false;
      }, 1500);
    },
    [applyDraft, canUseAdvancedRewardLogic, clearPresetTimeout, ensureSnapshot],
  );

  const generate = useCallback(async () => {
    if (
      !workspaceId ||
      !prompt.trim() ||
      !canUseAdvancedRewardLogic ||
      streamingRef.current
    ) {
      return;
    }

    clearPresetTimeout();
    const generationId = ++generationIdRef.current;
    streamingRef.current = true;
    ensureSnapshot();
    setHasPreviewContent(false);
    setPhase("streaming");
    setError(null);

    try {
      const { object } = await generateReward({
        workspaceId,
        event,
        prompt: prompt.trim(),
      });

      if (generationId !== generationIdRef.current) return;

      let lastPartial: Partial<AIRewardGenerationOutput> | null = null;
      for await (const partialObject of readStreamableValue(object)) {
        if (generationId !== generationIdRef.current) return;
        if (partialObject) {
          lastPartial = partialObject;
          if (partialObject.supported === true && partialObject.reward) {
            applyDraft(partialObject.reward, false);
          }
        }
      }

      if (generationId !== generationIdRef.current) return;

      if (!lastPartial) {
        setPhase("error");
        setError("Couldn't generate a reward. Try rephrasing your request.");
        return;
      }

      if (lastPartial.supported === false) {
        discard({ keepPrompt: true });
        toast.error("This reward setup isn't supported yet.", {
          description:
            "Reach out to support if you need help configuring this.",
        });
        void mutateWorkspace();
        return;
      }

      const parsed = getAIRewardSchema(event).safeParse(lastPartial.reward);
      if (!parsed.success) {
        setPhase("error");
        setError("Generated reward was incomplete. Try a clearer description.");
        return;
      }

      applyDraft(parsed.data, true);
      setPhase("review");
      void mutateWorkspace();
    } catch (err) {
      if (generationId !== generationIdRef.current) return;
      setPhase("error");
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate reward. Please try again.",
      );
    } finally {
      if (generationId === generationIdRef.current) {
        streamingRef.current = false;
      }
    }
  }, [
    applyDraft,
    canUseAdvancedRewardLogic,
    clearPresetTimeout,
    discard,
    ensureSnapshot,
    event,
    mutateWorkspace,
    prompt,
    workspaceId,
  ]);

  useEffect(() => {
    return () => {
      generationIdRef.current += 1;
      streamingRef.current = false;
      clearPresetTimeout();
    };
  }, [clearPresetTimeout]);

  return {
    prompt,
    setPrompt,
    phase,
    error,
    presets,
    isReviewing,
    hasPreviewContent,
    canUseAdvancedRewardLogic,
    workspaceSlug,
    generate,
    selectPreset,
    accept,
    discard,
  };
}

type AIRewardBuilderState = ReturnType<typeof useAIRewardBuilder>;

function chromeEnterStyle(
  open: boolean,
  reduced: boolean | null,
): CSSProperties | undefined {
  if (reduced) return undefined;
  return {
    transitionDuration: open ? `${CHROME_ENTER_MS}ms` : "150ms",
    transitionDelay: open ? "40ms" : "0ms",
    transitionTimingFunction: open ? EASE_CHROME : EASE_OUT_CSS,
  };
}

function creatingInStyle(
  delayMs: number,
  reduced: boolean | null,
): CSSProperties | undefined {
  if (reduced) return undefined;
  return {
    animation: `ai-creating-in ${CHROME_ENTER_MS}ms ${EASE_CHROME} both`,
    animationDelay: `${delayMs}ms`,
  };
}

export function AIRewardInput({
  event,
  builder,
}: {
  event: Exclude<EventType, "referral">;
  builder: AIRewardBuilderState;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);

  const {
    prompt,
    setPrompt,
    presets,
    canUseAdvancedRewardLogic,
    workspaceSlug,
    generate,
    selectPreset,
  } = builder;

  return (
    <div className="relative">
      <AnimatePresence initial={false} mode="popLayout">
        {!builder.isReviewing && (
          <motion.div
            key="ai-reward-input"
            initial={false}
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 1, transform: "translateY(0px) scale(1)" }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0, transition: { duration: 0.1 } }
                : {
                    opacity: 0,
                    transform: "translateY(-6px) scale(0.98)",
                    filter: "blur(2px)",
                    transition: {
                      duration: 0.18,
                      ease: EASE_OUT,
                    },
                  }
            }
            className="mb-4 origin-top"
          >
            <div
              className="border-border-subtle rounded-xl border bg-white text-sm shadow-sm"
              onFocus={() => {
                setFocused(true);
              }}
            >
              <div className="flex items-start gap-2.5 p-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                  <Sparkle3 className="size-4 text-neutral-800" />
                </div>
                <TextareaAutosize
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      void generate();
                      setFocused(false);
                    }
                  }}
                  placeholder={`Describe your ${event} reward...`}
                  disabled={!canUseAdvancedRewardLogic}
                  minRows={1}
                  maxRows={2}
                  className={cn(
                    "block min-w-0 flex-1 resize-none border-0 bg-transparent p-0 pt-1 text-sm font-normal leading-5 text-neutral-900 shadow-none",
                    "placeholder-neutral-400",
                    "focus:outline-none focus:ring-0",
                    "disabled:opacity-60",
                  )}
                />
              </div>

              <AnimatedSizeContainer
                height
                transition={{ duration: 0.2, ease: EASE_OUT }}
              >
                {focused && (
                  <div className="border-border-subtle -mx-px rounded-xl border-x border-t bg-neutral-100 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap gap-1.5">
                        {presets.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            disabled={!canUseAdvancedRewardLogic}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectPreset(preset.draft)}
                            className={cn(
                              "text-content-emphasis inline-flex h-7 w-fit items-center gap-1.5 rounded-lg bg-neutral-200/80 px-2.5 py-2 text-sm font-medium",
                              "transition-[transform,background-color] duration-150 ease-out",
                              "hover:bg-neutral-200 active:scale-[0.97]",
                              "disabled:cursor-not-allowed disabled:opacity-50",
                            )}
                          >
                            <Sparkle3
                              variant="fill"
                              className="size-3.5 shrink-0"
                            />
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        text="Generate"
                        className="h-7 w-fit shrink-0 rounded-lg px-2.5 py-2 text-sm active:scale-[0.97]"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => void generate()}
                        disabled={!canUseAdvancedRewardLogic || !prompt.trim()}
                        disabledTooltip={
                          !canUseAdvancedRewardLogic ? (
                            <TooltipContent
                              title="AI reward builder is only available on the Advanced plan and above."
                              cta="Upgrade to Advanced"
                              href={`/${workspaceSlug}/upgrade?plan=advanced&showAdvancedUpsellModal=true`}
                              target="_blank"
                            />
                          ) : undefined
                        }
                      />
                    </div>
                  </div>
                )}
              </AnimatedSizeContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PIXEL_DELAYS = Array.from({ length: 9 }, (_, i) => {
  const row = Math.floor(i / 3);
  const col = i % 3;
  return (col + Math.abs(row - 1)) * 90;
});

function GeneratingStyles() {
  return (
    <style href="ai-generating" precedence="default">{`
      @keyframes ai-pixel-on {
        0%,
        100% {
          opacity: 0.15;
        }
        40%,
        60% {
          opacity: 1;
        }
      }
      @keyframes ai-shimmer-text {
        0% {
          background-position: 100% 0;
        }
        100% {
          background-position: -100% 0;
        }
      }
      @keyframes ai-creating-in {
        from {
          opacity: 0;
          transform: translateY(4px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .ai-pixel-on {
          animation: none !important;
          opacity: 0.35 !important;
        }
        .ai-shimmer-text {
          animation: none !important;
          background: none !important;
          color: #737373 !important;
        }
        .ai-creating-in {
          animation: none !important;
        }
      }
    `}</style>
  );
}

function GeneratingStatus() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className="flex w-fit items-center gap-2.5"
      role="status"
      aria-live="polite"
      aria-label="Generating reward"
    >
      <GeneratingStyles />
      <span aria-hidden className="grid grid-cols-3 gap-[1.5px]">
        {PIXEL_DELAYS.map((delayMs, i) => (
          <span
            key={i}
            className="ai-pixel-on size-1 rounded-[1px] bg-neutral-500"
            style={
              shouldReduceMotion
                ? { opacity: 0.35 }
                : {
                    opacity: 0.15,
                    animation: `ai-pixel-on 650ms ease-in-out ${delayMs}ms infinite`,
                  }
            }
          />
        ))}
      </span>
      <span
        aria-hidden
        className={cn(
          "text-[13px] font-medium",
          shouldReduceMotion
            ? "text-neutral-500"
            : "ai-shimmer-text bg-clip-text text-transparent",
        )}
        style={
          shouldReduceMotion
            ? undefined
            : {
                backgroundImage:
                  "linear-gradient(90deg, #a3a3a3 35%, #171717 50%, #a3a3a3 65%)",
                backgroundSize: "200% 100%",
                animation: "ai-shimmer-text 1.4s linear infinite",
              }
        }
      >
        Generating
      </span>
    </div>
  );
}

function ChromeAction({
  open,
  delayClassName,
  children,
}: {
  open: boolean;
  delayClassName: string;
  children: ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        !shouldReduceMotion &&
          "transition-[opacity,transform] will-change-[opacity,transform]",
        open
          ? cn("translate-y-0 opacity-100 duration-200", delayClassName)
          : "translate-y-1 opacity-0 delay-0 duration-100",
      )}
      style={
        shouldReduceMotion
          ? undefined
          : {
              transitionTimingFunction: open ? EASE_CHROME : EASE_OUT_CSS,
            }
      }
    >
      {children}
    </div>
  );
}

function ChromeHeaderTitle({ isCreating }: { isCreating: boolean }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="absolute bottom-1.5 top-0.5 flex items-center"
      initial={false}
      animate={isCreating ? { left: "50%", x: "-50%" } : { left: 8, x: 0 }}
      transition={
        shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT }
      }
    >
      <div className="grid grid-cols-1 grid-rows-1 items-center">
        <AnimatePresence initial={false}>
          {isCreating ? (
            <motion.div
              key="generating"
              className="col-start-1 row-start-1"
              initial={
                shouldReduceMotion ? false : { opacity: 0, y: 4, scale: 0.98 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, transition: { duration: 0.12 } }
              }
              transition={{ duration: 0.2, ease: EASE_OUT }}
            >
              <GeneratingStatus />
            </motion.div>
          ) : (
            <motion.div
              key="generated"
              className="col-start-1 row-start-1"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.2,
                delay: shouldReduceMotion ? 0 : 0.06,
                ease: EASE_OUT,
              }}
            >
              <span className="text-content-emphasis text-sm font-medium leading-none">
                Generated reward
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function AIRewardPreviewFrame({
  builder,
  children,
}: PropsWithChildren<{
  builder: AIRewardBuilderState;
}>) {
  const shouldReduceMotion = useReducedMotion();
  const { isReviewing, phase, error, accept, discard, hasPreviewContent } =
    builder;

  const [chromeMounted, setChromeMounted] = useState(false);
  const [chromeOpen, setChromeOpen] = useState(false);
  const [exitKind, setExitKind] = useState<
    "accept" | "discard" | "retry" | null
  >(null);
  const exitKindRef = useRef<"accept" | "discard" | "retry" | null>(null);

  useEffect(() => {
    if (!isReviewing) {
      if (exitKindRef.current) return;
      setChromeOpen(false);
      setChromeMounted(false);
      return;
    }

    setChromeMounted(true);
    exitKindRef.current = null;
    setExitKind(null);

    if (shouldReduceMotion) {
      setChromeOpen(true);
      return;
    }

    setChromeOpen(false);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setChromeOpen(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [isReviewing, shouldReduceMotion]);

  const finishExit = useCallback(() => {
    const kind = exitKindRef.current;
    exitKindRef.current = null;
    setExitKind(null);
    setChromeMounted(false);

    if (kind === "accept") accept();
    else if (kind === "discard") discard();
    else if (kind === "retry") discard({ keepPrompt: true });
  }, [accept, discard]);

  const requestExit = (kind: "accept" | "discard" | "retry") => {
    if (exitKindRef.current || phase === "streaming") return;

    if (shouldReduceMotion) {
      exitKindRef.current = kind;
      finishExit();
      return;
    }

    exitKindRef.current = kind;
    setExitKind(kind);
    setChromeOpen(false);

    window.setTimeout(() => {
      if (exitKindRef.current === kind) finishExit();
    }, 180);
  };

  const onChromeTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "opacity") return;
    if (chromeOpen || !exitKindRef.current) return;
    finishExit();
  };

  const showSkeletons = phase === "streaming" && !hasPreviewContent;
  const showError = phase === "error" && Boolean(error);
  const isCreating = phase === "streaming";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-[14px]",
        chromeMounted && "max-h-[min(70vh,calc(100dvh-14rem))] p-1",
      )}
    >
      {chromeMounted && (
        <div
          aria-hidden
          onTransitionEnd={onChromeTransitionEnd}
          className={cn(
            "pointer-events-none absolute inset-0 origin-top rounded-[14px] bg-amber-100",
            !shouldReduceMotion &&
              "transition-[opacity,transform] will-change-[opacity,transform]",
            chromeOpen
              ? "translate-y-0 scale-100 opacity-100"
              : cn(
                  "opacity-0",
                  exitKind === "accept" && "-translate-y-1 scale-[0.99]",
                  (exitKind === "discard" || exitKind === "retry") &&
                    "translate-y-1 scale-[0.98]",
                  exitKind == null && "scale-[0.98]",
                ),
          )}
          style={chromeEnterStyle(chromeOpen, shouldReduceMotion)}
        />
      )}

      <div
        className={cn(
          "relative z-10 flex min-h-0 flex-1 flex-col",
          chromeMounted && "overflow-hidden",
        )}
      >
        {chromeMounted && (
          <div
            className={cn(
              "relative flex h-9 shrink-0 items-center pb-1.5 pl-2 pr-[6px] pt-0.5",
              !shouldReduceMotion &&
                "transition-[opacity,transform] will-change-[opacity,transform]",
              chromeOpen
                ? "translate-y-0 opacity-100"
                : "-translate-y-1 opacity-0",
            )}
            style={chromeEnterStyle(chromeOpen, shouldReduceMotion)}
          >
            <ChromeHeaderTitle isCreating={isCreating} />

            {phase !== "error" && (
              <div
                className="ml-auto flex items-center gap-1.5"
                inert={isCreating || undefined}
              >
                <ChromeAction
                  open={chromeOpen && !isCreating}
                  delayClassName="delay-75"
                >
                  <Button
                    type="button"
                    variant="secondary"
                    text="Discard"
                    className="h-7 w-fit rounded-lg px-3 active:scale-[0.97]"
                    disabled={isCreating || exitKind != null}
                    onClick={() => requestExit("discard")}
                  />
                </ChromeAction>
                <ChromeAction
                  open={chromeOpen && !isCreating && phase === "review"}
                  delayClassName="delay-100"
                >
                  <Button
                    type="button"
                    variant="primary"
                    text="Accept"
                    className="h-7 w-fit rounded-lg px-3 active:scale-[0.97]"
                    disabled={
                      isCreating || phase !== "review" || exitKind != null
                    }
                    onClick={() => requestExit("accept")}
                  />
                </ChromeAction>
              </div>
            )}
          </div>
        )}

        {showError ? (
          <div className="space-y-2 rounded-[12px] border border-neutral-200 bg-white p-3">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              type="button"
              variant="secondary"
              text="Try again"
              className="h-8 w-fit rounded-lg px-3 active:scale-[0.97]"
              disabled={exitKind != null}
              onClick={() => requestExit("retry")}
            />
          </div>
        ) : showSkeletons ? (
          <div
            className={cn(!shouldReduceMotion && "ai-creating-in")}
            style={creatingInStyle(80, shouldReduceMotion)}
          >
            <ReviewSkeletons />
          </div>
        ) : (
          <div
            className={cn("min-h-0", chromeMounted && "flex-1 overflow-y-auto")}
          >
            <div
              className={cn(isCreating && "pointer-events-none select-none")}
              inert={isCreating || undefined}
            >
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-6 animate-pulse rounded-md bg-neutral-100",
        className,
      )}
    />
  );
}

function ReviewSkeletons() {
  return (
    <div className="border-border-subtle rounded-xl border bg-white text-sm shadow-sm">
      <div className="flex items-start gap-2.5 p-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
          <div className="size-4 animate-pulse rounded-sm bg-neutral-200" />
        </div>
        <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1.5 text-sm leading-relaxed text-neutral-400">
          <span>Pay a</span>
          <SkeletonPill className="w-14" />
          <span>of</span>
          <SkeletonPill className="w-12" />
          <span>per sale for</span>
          <SkeletonPill className="w-16" />
          <span>, with</span>
          <SkeletonPill className="w-20" />
        </p>
      </div>
      <div className="border-border-subtle -mx-px rounded-xl border-x border-t bg-neutral-50 p-2.5">
        <Button
          type="button"
          variant="secondary"
          className="h-8 rounded-lg"
          icon={<ArrowTurnRight2 className="size-4" />}
          text="Add condition"
          disabled
        />
      </div>
    </div>
  );
}
