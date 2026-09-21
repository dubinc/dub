"use server";

import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  filterValidatedTooltipSuggestions,
  getRewardConditionAttribute,
  stripRewardTooltipMarkdown,
} from "@/lib/rewards/validate-tooltip-suggestion";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import {
  CONDITION_OPERATOR_LABELS,
  REWARD_CONDITIONS,
} from "@/lib/zod/schemas/rewards";
import { anthropic } from "@ai-sdk/anthropic";
import { type EventType } from "@prisma/client";
import { experimental_evaluate as evaluate, generateText, Output } from "ai";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";
import {
  reviewRewardTooltipInputSchema,
  reviewRewardTooltipOutputSchema,
  TOOLTIP_SUGGESTION_CONFIDENCE_FLOOR,
  type PayoutFix,
  type ReviewRewardTooltipModifier,
  type RewardPayout,
  type TooltipSuggestion,
} from "./review-reward-tooltip-schema";

export async function screenRewardTooltipContradiction(
  input: unknown,
): Promise<{ flagged: boolean | null }> {
  try {
    const authorized = await authorizeRewardTooltipReview(input);
    if (!authorized) {
      return { flagged: false };
    }

    const tooltip = stripRewardTooltipMarkdown(authorized.data.tooltip);
    if (!tooltip) {
      return { flagged: false };
    }

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.aiRewardTooltipScreen,
      identifier: [authorized.userId, authorized.workspaceId],
    });

    const reward = describeReward({
      ...authorized.data,
      tooltip,
    });
    const result = await evaluate({
      model: "typesafe-ai/jev",
      state: reward,
      questions: {
        contradicts: {
          type: "boolean",
          instructions:
            "Would a partner who read the shown-as text or the tooltip be surprised by this reward?",
          criteria: {
            true: {
              meaning:
                "Yes when the partner copy states an amount, a duration, or an eligibility rule that the payout or a condition does not match. One strong mismatch is enough. Use a low probability when unsure.",
              matches_any: [
                "The copy says every month, every N months, monthly, recurring, lifetime, or one time, and that is not the payout duration.",
                "The copy states a dollar or percent amount that is not what the default payout or the matching condition group pays.",
                "The copy says minimum, at least, or that a threshold qualifies, but the condition uses a strict greater-than or less-than that excludes that boundary.",
                "The copy says more than, over, or above, but the condition includes the boundary.",
                "The copy names a different operator or threshold than an existing condition.",
              ],
            },
            false: {
              meaning:
                "No when the copy agrees with the payout and the conditions, or when it does not clearly state a conflicting amount, duration, operator, or threshold.",
              even_if: [
                "The copy is shorter than the config or omits extra filters such as country, product, or metadata.",
                "The copy never mentions a condition that still exists, and it also does not state a conflicting amount or duration.",
                "The wording is informal and does not clearly name a different amount, duration, operator, or threshold.",
              ],
            },
          },
        },
      },
      providerOptions: {
        gateway: {
          zeroDataRetention: true,
        },
      },
    });

    const answer = result.answers.contradicts;
    if (answer?.type !== "boolean") {
      console.log("[screenRewardTooltipContradiction] jev result", {
        reward,
        answer,
        flagged: null,
      });
      return { flagged: null };
    }

    const flagged =
      Number.isFinite(answer.probability) &&
      answer.probability > TOOLTIP_SUGGESTION_CONFIDENCE_FLOOR;

    console.log("[screenRewardTooltipContradiction] jev result", {
      reward,
      probability: answer.probability,
      flagged,
    });

    return { flagged };
  } catch (error) {
    console.error("[screenRewardTooltipContradiction]", error);
    return { flagged: null };
  }
}

export async function reviewRewardTooltipConsistency(input: unknown): Promise<{
  suggestions: TooltipSuggestion[];
  payoutFixes: PayoutFix[];
  note: string | null;
}> {
  const empty = { suggestions: [], payoutFixes: [], note: null };

  try {
    const authorized = await authorizeRewardTooltipReview(input);
    if (!authorized) {
      return empty;
    }

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.aiRewardTooltipReview,
      identifier: [authorized.userId, authorized.workspaceId],
    });

    const tooltip = stripRewardTooltipMarkdown(authorized.data.tooltip);
    if (!tooltip) {
      return empty;
    }

    const { event, modifiers, basePayout } = authorized.data;
    const reward = describeReward({
      ...authorized.data,
      tooltip,
    });

    const { output } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      output: Output.object({
        schema: reviewRewardTooltipOutputSchema,
      }),
      system: buildSystemPrompt(event),
      prompt: `Partner copy and the reward it must match:
${JSON.stringify(reward, null, 2)}

Use modifierIndex and conditionIndex from conditionGroups when a condition should change. Write the reason for a non-technical user.`,
      temperature: 0,
      maxOutputTokens: 900,
    });

    const parsedOutput = reviewRewardTooltipOutputSchema.safeParse(output);
    if (!parsedOutput.success) {
      return empty;
    }

    const suggestions = filterValidatedTooltipSuggestions({
      event,
      modifiers,
      suggestions: parsedOutput.data.suggestions,
    });
    const payoutFixes = filterPayoutFixes({
      basePayout,
      modifiers,
      fixes: parsedOutput.data.payoutFixes,
    });

    return {
      suggestions,
      payoutFixes,
      note:
        suggestions.length || payoutFixes.length
          ? null
          : parsedOutput.data.note?.trim() || null,
    };
  } catch (error) {
    console.error("[reviewRewardTooltipConsistency]", error);
    return empty;
  }
}

async function authorizeRewardTooltipReview(input: unknown) {
  const parsedInput = reviewRewardTooltipInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return null;
  }

  const session = await getSession();
  if (!session?.user.id) {
    return null;
  }

  const workspaceId = normalizeWorkspaceId(parsedInput.data.workspaceId);
  const workspace = await prisma.project.findUnique({
    where: { id: workspaceId },
    include: {
      users: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!workspace?.users?.length) {
    return null;
  }

  throwIfNoPermission({
    role: workspace.users[0].role,
    requiredRoles: ["owner", "member"],
  });

  return {
    userId: session.user.id,
    workspaceId,
    data: parsedInput.data,
  };
}

function buildSystemPrompt(event: string) {
  return `You review whether partner-facing reward copy contradicts the structured reward.

Event type: ${event}

The reward has partner copy (shown-as text and tooltip), a default payout, and condition groups. Each group pays its own amount and duration when its conditions match. The default payout applies when no group matches. Amounts are dollars for flat payouts and percents for percentage payouts. Duration is "one time", "for N months", or "for the customer's lifetime".

Rules:
- Compare meaning, not wording.
- Only flag an EXISTING condition that a partner who read the copy would find surprising.
- Do not flag extra conditions the copy never mentioned.
- Do not invent new condition rows. Do not change entity or attribute.
- A suggestion may change operator and/or value only.
- When the copy states an amount or duration that a payout does not match, return a payoutFix for each payout that disagrees. Set amount and/or maxDuration to what the copy says. Omit a field that already matches.
- "no money", "$0", "free", or "earn nothing" means amount 0.
- "no month", "one time", or "not monthly" means maxDuration 0.
- "every month" or "monthly" means maxDuration 1. "every N months" means maxDuration N. "lifetime" means maxDuration null.
- If you return a condition suggestion or a payoutFix, set note to null.
- Use note only when the copy disagrees and you cannot name the replacement amount, duration, operator, or threshold.
- If you are not sure, return suggestions: [], payoutFixes: [], and note: null. Never guess.
- confidence is 0–1. Use below 0.5 when the reading is ambiguous or only loosely implied.
- reason and note must be one short sentence a program manager can understand.
- Use the human operator labels (e.g. "is greater than"), never raw IDs like greater_than or field paths like sale.amount.
- Wrap the copy phrase and the conflicting wording in double quotes.
- Do not explain inclusive/exclusive in parentheses. Say what a partner would expect vs what the reward does.

Good reason: "Minimum $20 deposit" implies $20 qualifies, but "is greater than" excludes it.
Bad reason: Tooltip says "min $20" (at least $20, inclusive) but the condition uses greater_than 20 (excludes $20).

Condition contradictions:
- Copy says "minimum $20" / "at least $20" but the condition is "is greater than" $20 (excludes $20).
- Copy says "more than $20" / "over $20" but the condition is "is greater than or equal to" $20.

Payout fixes, not a note:
- Copy says "earn no money" and "no month", but the default payout is $10 one time and a condition group pays $30 one time. Return two payoutFixes with amount 0. Omit maxDuration because it is already one time.
- Copy says "every 3 months" but the payout duration is "one time". Return maxDuration 3 and omit amount if it already matches.
- Copy says "earn $300" but the payout is a flat $10. Return amount 300 and omit maxDuration if it already matches.

Not contradictions:
- Copy is shorter than the config or omits extra filters (country, product, metadata).
- Informal wording that does not clearly specify a different amount, duration, operator, or threshold.`;
}

function describeReward({
  event,
  tooltip,
  description,
  basePayout,
  modifiers,
}: {
  event: EventType;
  tooltip: string;
  description?: string | null;
  basePayout: RewardPayout;
  modifiers: ReviewRewardTooltipModifier[];
}) {
  const shownAs = stripRewardTooltipMarkdown(description ?? "");

  return {
    event,
    partnerCopy: {
      shownAs: shownAs || null,
      tooltip,
    },
    defaultPayout: {
      pays: formatPayout(basePayout),
      appliesWhen: "no condition group matches",
    },
    conditionGroups: modifiers.map((modifier, modifierIndex) => ({
      modifierIndex,
      match:
        modifier.operator === "OR"
          ? "any condition (OR)"
          : "every condition (AND)",
      when: modifier.conditions.map((condition, conditionIndex) => ({
        conditionIndex,
        rule: formatCondition(event, condition),
      })),
      thenPays: formatPayout(modifier.payout),
    })),
  };
}

function formatPayout(payout: RewardPayout) {
  const amount =
    payout.type === "percentage"
      ? `${payout.amount ?? 0}% of the sale`
      : `$${payout.amount ?? 0} flat`;
  const duration =
    payout.maxDuration == null
      ? "for the customer's lifetime"
      : payout.maxDuration === 0
        ? "one time"
        : `for ${payout.maxDuration} month${payout.maxDuration === 1 ? "" : "s"}`;

  return `${amount}, ${duration}`;
}

function filterPayoutFixes({
  basePayout,
  modifiers,
  fixes,
}: {
  basePayout: RewardPayout;
  modifiers: ReviewRewardTooltipModifier[];
  fixes: PayoutFix[];
}): PayoutFix[] {
  const byTarget = new Map<string, PayoutFix>();

  for (const fix of fixes) {
    if (
      typeof fix.confidence !== "number" ||
      fix.confidence < TOOLTIP_SUGGESTION_CONFIDENCE_FLOOR ||
      !fix.reason?.trim()
    ) {
      continue;
    }

    const current =
      fix.scope === "default"
        ? basePayout
        : modifiers[fix.modifierIndex ?? -1]?.payout;

    if (!current) continue;
    if (fix.scope === "group" && typeof fix.modifierIndex !== "number") {
      continue;
    }

    const nextDuration =
      fix.maxDuration === undefined ? current.maxDuration : fix.maxDuration;
    const amountChanges =
      typeof fix.amount === "number" && fix.amount !== current.amount;
    const durationChanges =
      fix.maxDuration !== undefined && nextDuration !== current.maxDuration;

    if (!amountChanges && !durationChanges) continue;

    const key =
      fix.scope === "default" ? "default" : `group:${fix.modifierIndex}`;
    const existing = byTarget.get(key);

    if (!existing || fix.confidence > existing.confidence) {
      byTarget.set(key, {
        ...fix,
        reason: fix.reason.trim(),
        amount: amountChanges ? fix.amount : null,
        maxDuration: durationChanges ? nextDuration : undefined,
      });
    }
  }

  return [...byTarget.values()];
}

function formatCondition(
  event: EventType,
  condition: ReviewRewardTooltipModifier["conditions"][number],
) {
  const attribute = getRewardConditionAttribute({
    event,
    entity: condition.entity,
    attribute: condition.attribute,
  });
  const entity = REWARD_CONDITIONS[event].entities.find(
    (entry) => entry.id === condition.entity,
  );
  const operator =
    CONDITION_OPERATOR_LABELS[condition.operator] ?? condition.operator;
  const field = condition.metadataField
    ? `${attribute?.label ?? condition.attribute} (${condition.metadataField})`
    : attribute?.label ?? condition.attribute;

  return `${entity?.label ?? condition.entity} ${field} ${operator} ${formatConditionValue(attribute?.type, condition.value)}`;
}

function formatConditionValue(
  type: string | undefined,
  value: unknown,
): string {
  if (Array.isArray(value)) {
    return value.map((item) => formatConditionValue(type, item)).join(", ");
  }

  if (
    type === "currency" &&
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return `$${value}`;
  }

  return String(value);
}
