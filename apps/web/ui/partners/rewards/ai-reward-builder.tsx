"use client";

import { AIRewardDraft, aiRewardSchema } from "@/lib/ai/ai-reward-schema";
import { generateReward } from "@/lib/ai/generate-reward";
import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  CONDITION_OPERATOR_LABELS,
  REWARD_CONDITION_ATTRIBUTES,
  REWARD_CONDITIONS,
} from "@/lib/zod/schemas/rewards";
import { readStreamableValue } from "@ai-sdk/rsc";
import { AnimatedSizeContainer, Button, TooltipContent } from "@dub/ui";
import { Magic } from "@dub/ui/icons";
import {
  capitalize,
  cn,
  COUNTRIES,
  currencyFormatter,
  pluralize,
} from "@dub/utils";
import { EventType, RewardStructure } from "@prisma/client";
import { AnimatePresence, motion } from "motion/react";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { REWARD_PRESETS } from "./reward-presets";

type AIRewardBuilderProps = {
  event: Exclude<EventType, "referral">;
  onAccept: (draft: AIRewardDraft) => void;
};

type BuilderPhase = "idle" | "streaming" | "review" | "error";

export function applyRewardDraftToForm({
  draft,
  event,
  setValue,
}: {
  draft: AIRewardDraft;
  event: Exclude<EventType, "referral">;
  setValue: (
    name: string,
    value: unknown,
    options?: { shouldDirty?: boolean },
  ) => void;
}) {
  const isOneOffEvent = event === "click" || event === "lead";
  const type: RewardStructure = isOneOffEvent ? "flat" : draft.type;
  const maxDuration = isOneOffEvent
    ? 0
    : draft.maxDuration == null
      ? Infinity
      : draft.maxDuration;

  setValue("type", type, { shouldDirty: true });

  if (type === "flat") {
    setValue("amountInCents", draft.amount, { shouldDirty: true });
    setValue("amountInPercentage", undefined, { shouldDirty: true });
  } else {
    setValue("amountInPercentage", draft.amount, { shouldDirty: true });
    setValue("amountInCents", undefined, { shouldDirty: true });
  }

  setValue("maxDuration", maxDuration, { shouldDirty: true });

  const modifiers = draft.modifiers?.filter((m) => m.conditions?.length);
  if (!modifiers?.length) {
    setValue("modifiers", undefined, { shouldDirty: true });
    return;
  }

  setValue(
    "modifiers",
    modifiers.map((modifier) => {
      const modifierType = modifier.type === undefined ? type : modifier.type;
      const modifierMaxDuration =
        modifier.maxDuration === undefined
          ? maxDuration
          : modifier.maxDuration == null
            ? Infinity
            : modifier.maxDuration;

      return {
        id: uuid(),
        operator: modifier.operator ?? "AND",
        conditions: modifier.conditions,
        type: modifier.type,
        amountInCents:
          modifier.amount !== undefined && modifierType === "flat"
            ? modifier.amount
            : undefined,
        amountInPercentage:
          modifier.amount !== undefined && modifierType === "percentage"
            ? modifier.amount
            : undefined,
        maxDuration: event === "sale" ? modifierMaxDuration : undefined,
      };
    }),
    { shouldDirty: true },
  );
}

function formatDurationLabel(maxDuration: number | null | undefined) {
  if (maxDuration === undefined) return null;
  if (maxDuration === null) return "for the customer's lifetime";
  if (maxDuration === 0) return "one time";
  return `for ${maxDuration} ${pluralize("month", maxDuration)}`;
}

function draftToPreviewReward(
  draft: Partial<AIRewardDraft>,
  event: Exclude<EventType, "referral">,
) {
  if (draft.type == null || draft.amount == null) return null;

  const type = event === "click" || event === "lead" ? "flat" : draft.type;
  const maxDuration =
    event === "click" || event === "lead"
      ? 0
      : draft.maxDuration === undefined
        ? undefined
        : draft.maxDuration;

  return {
    event,
    type,
    amountInCents: type === "flat" ? Math.round(draft.amount * 100) : null,
    amountInPercentage: type === "percentage" ? draft.amount : null,
    maxDuration: maxDuration ?? null,
    modifiers: draft.modifiers?.map((modifier) => {
      const modifierType = modifier.type ?? type;
      return {
        operator: modifier.operator ?? "AND",
        conditions: modifier.conditions ?? [],
        type: modifier.type,
        amountInCents:
          modifier.amount != null && modifierType === "flat"
            ? Math.round(modifier.amount * 100)
            : undefined,
        amountInPercentage:
          modifier.amount != null && modifierType === "percentage"
            ? modifier.amount
            : undefined,
        maxDuration: modifier.maxDuration,
      };
    }),
  };
}

function getAttributeType(attributeId: string) {
  return REWARD_CONDITION_ATTRIBUTES.find((a) => a.id === attributeId)?.type;
}

export function AIRewardBuilder({ event, onAccept }: AIRewardBuilderProps) {
  const { id: workspaceId, slug: workspaceSlug, plan } = useWorkspace();
  const { canUseAdvancedRewardLogic } = getPlanCapabilities(plan);

  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<BuilderPhase>("idle");
  const [draft, setDraft] = useState<Partial<AIRewardDraft> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presets = REWARD_PRESETS[event] ?? [];

  const validatedDraft = useMemo(() => {
    if (!draft) return null;
    const parsed = aiRewardSchema.safeParse(draft);
    return parsed.success ? parsed.data : null;
  }, [draft]);

  const resetReview = useCallback(() => {
    setPhase("idle");
    setDraft(null);
    setError(null);
  }, []);

  const startReview = useCallback(
    (nextDraft: AIRewardDraft | Partial<AIRewardDraft>) => {
      setDraft(nextDraft);
      setPhase("review");
      setError(null);
    },
    [],
  );

  const onSelectPreset = (presetDraft: AIRewardDraft) => {
    if (!canUseAdvancedRewardLogic) return;
    setPrompt("");
    startReview(presetDraft);
  };

  const onGenerate = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!workspaceId || !prompt.trim() || !canUseAdvancedRewardLogic) return;

    setPhase("streaming");
    setDraft(null);
    setError(null);

    try {
      const { object } = await generateReward({
        workspaceId,
        event,
        prompt: prompt.trim(),
      });

      let lastPartial: Partial<AIRewardDraft> | null = null;
      for await (const partialObject of readStreamableValue(object)) {
        if (partialObject) {
          lastPartial = partialObject;
          setDraft(partialObject);
        }
      }

      if (!lastPartial) {
        setPhase("error");
        setError("Couldn't generate a reward. Try rephrasing your request.");
        return;
      }

      const parsed = aiRewardSchema.safeParse(lastPartial);
      if (!parsed.success) {
        setPhase("error");
        setError("Generated reward was incomplete. Try a clearer description.");
        return;
      }

      setDraft(parsed.data);
      setPhase("review");
    } catch (err) {
      setPhase("error");
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate reward. Please try again.",
      );
    }
  };

  const handleAccept = () => {
    if (!validatedDraft) {
      toast.error("Reward draft is invalid. Please regenerate or discard.");
      return;
    }

    onAccept(validatedDraft);
    toast.success("Reward applied — review and save when ready.");
    resetReview();
    setPrompt("");
  };

  const showReview =
    phase === "streaming" || phase === "review" || phase === "error";

  return (
    <div className="border-border-subtle mb-4 overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="flex items-start gap-2.5 p-3">
        <div className="bg-bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Magic className="size-4 text-neutral-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-content-emphasis text-sm font-medium">
            Describe your reward
          </div>
          <p className="text-content-muted text-xs">
            Use AI or a preset, then review before applying to the form.
          </p>
        </div>
      </div>

      <div className="border-border-subtle space-y-3 border-t bg-neutral-50 p-3">
        <form onSubmit={onGenerate} className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              event === "sale"
                ? "e.g. 15% for 12 months, 25% for US customers"
                : event === "lead"
                  ? "e.g. $20 per lead, $40 for trial leads"
                  : "e.g. $0.75 per click for US traffic"
            }
            disabled={!canUseAdvancedRewardLogic || phase === "streaming"}
            className="block w-full rounded-md border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 disabled:opacity-60"
          />
          <Button
            type="submit"
            variant="secondary"
            text="Generate"
            className="h-9 w-fit shrink-0 px-3"
            loading={phase === "streaming"}
            disabled={
              !canUseAdvancedRewardLogic ||
              !prompt.trim() ||
              phase === "streaming"
            }
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
        </form>

        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={!canUseAdvancedRewardLogic || phase === "streaming"}
                onClick={() => onSelectPreset(preset.draft)}
                className={cn(
                  "rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors",
                  "hover:border-neutral-300 hover:bg-neutral-50",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        <AnimatedSizeContainer height>
          <AnimatePresence initial={false} mode="popLayout">
            {showReview && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {phase === "streaming" ? "Generating…" : "Review"}
                    </span>
                    {phase !== "streaming" && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          text="Discard"
                          className="h-7 w-fit px-2.5 text-xs"
                          onClick={resetReview}
                        />
                        {phase === "review" && (
                          <Button
                            type="button"
                            variant="primary"
                            text="Accept"
                            className="h-7 w-fit px-2.5 text-xs"
                            disabled={!validatedDraft}
                            onClick={handleAccept}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {phase === "error" && error ? (
                    <div className="space-y-2">
                      <p className="text-sm text-red-600">{error}</p>
                      <Button
                        type="button"
                        variant="secondary"
                        text="Try again"
                        className="h-7 w-fit px-2.5 text-xs"
                        onClick={() => {
                          setPhase("idle");
                          setDraft(null);
                          setError(null);
                        }}
                      />
                    </div>
                  ) : phase === "streaming" && !draft ? (
                    <ReviewSkeletons />
                  ) : draft ? (
                    <RewardDraftPreview draft={draft} event={event} />
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </AnimatedSizeContainer>
      </div>
    </div>
  );
}

function ReviewSkeletons() {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="h-10 w-full animate-pulse rounded-md border border-neutral-100 bg-neutral-50"
        />
      ))}
    </div>
  );
}

function RewardDraftPreview({
  draft,
  event,
}: {
  draft: Partial<AIRewardDraft>;
  event: Exclude<EventType, "referral">;
}) {
  const preview = draftToPreviewReward(draft, event);

  if (!preview) {
    return <ReviewSkeletons />;
  }

  const baseAmount = constructRewardAmount({
    type: preview.type,
    amountInCents: preview.amountInCents ?? undefined,
    amountInPercentage: preview.amountInPercentage ?? undefined,
    maxDuration: preview.maxDuration,
  });

  const durationLabel =
    event === "sale" ? formatDurationLabel(preview.maxDuration) : null;

  return (
    <div className="space-y-2.5">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm text-neutral-800"
      >
        <span className="font-medium">{baseAmount}</span> per {event}
        {durationLabel ? ` ${durationLabel}` : ""}
        {preview.modifiers?.length ? (
          <span className="text-neutral-500"> (base)</span>
        ) : null}
      </motion.div>

      {preview.modifiers?.map((modifier, idx) => {
        const modifierType = modifier.type ?? preview.type;
        const modifierDuration =
          modifier.maxDuration === undefined
            ? preview.maxDuration
            : modifier.maxDuration;
        const amount =
          modifier.amountInCents != null || modifier.amountInPercentage != null
            ? constructRewardAmount({
                type: modifierType,
                amountInCents: modifier.amountInCents,
                amountInPercentage: modifier.amountInPercentage,
                maxDuration: modifierDuration,
              })
            : baseAmount;
        const modifierDurationLabel =
          event === "sale" ? formatDurationLabel(modifierDuration) : null;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * (idx + 1) }}
            className="rounded-md border border-neutral-100 bg-neutral-50 px-2.5 py-2"
          >
            <div className="text-sm font-medium text-neutral-800">
              Then {amount}
              {modifierDurationLabel ? ` ${modifierDurationLabel}` : ""}
            </div>
            <ul className="mt-1 space-y-0.5 text-xs text-neutral-600">
              {(modifier.conditions ?? []).map((condition, cIdx) => {
                const entity = REWARD_CONDITIONS[event].entities.find(
                  (en) => en.id === condition.entity,
                );
                const attribute = entity?.attributes?.find(
                  (a) => a.id === condition.attribute,
                );
                const valueLabel = formatConditionValue(condition);

                return (
                  <li key={cIdx}>
                    {cIdx === 0 ? "If" : capitalize(modifier.operator ?? "AND")}{" "}
                    {capitalize(condition.entity)}{" "}
                    {condition.attribute === "metadata" &&
                    condition.metadataField
                      ? `"${condition.metadataField}"`
                      : capitalize(
                          attribute?.label ?? condition.attribute,
                        )}{" "}
                    {CONDITION_OPERATOR_LABELS[
                      condition.operator as keyof typeof CONDITION_OPERATOR_LABELS
                    ] ?? condition.operator}{" "}
                    {valueLabel}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        );
      })}
    </div>
  );
}

function formatConditionValue(condition: {
  attribute: string;
  value: string | number | string[] | number[];
}) {
  const { attribute, value } = condition;

  if (attribute === "country") {
    if (Array.isArray(value)) {
      return value.map((v) => COUNTRIES[String(v)] ?? v).join(", ");
    }
    return COUNTRIES[String(value)] ?? String(value);
  }

  if (getAttributeType(attribute) === "currency" && typeof value === "number") {
    return currencyFormatter(value * 100, {
      trailingZeroDisplay: "stripIfInteger",
    });
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}
