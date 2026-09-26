import { AI_REWARD_EVENTS } from "@/lib/ai/ai-reward-schema";
import { CONDITION_OPERATORS } from "@/lib/zod/schemas/rewards";
import * as z from "zod/v4";

export const TOOLTIP_SUGGESTION_CONFIDENCE_FLOOR = 0.5;

const tooltipSuggestionValueSchema = z.union([
  z.string(),
  z.number(),
  z.array(z.string()),
  z.array(z.number()),
]);

const tooltipSuggestionPatchSchema = z.object({
  operator: z
    .enum(CONDITION_OPERATORS)
    .optional()
    .describe("Replacement operator. Omit to keep the current operator."),
  value: tooltipSuggestionValueSchema
    .optional()
    .describe("Replacement value. Omit to keep the current value."),
});

const tooltipSuggestionSchema = z.object({
  modifierIndex: z
    .number()
    .int()
    .nonnegative()
    .describe("Index of the existing modifier group (0-based)."),
  conditionIndex: z
    .number()
    .int()
    .nonnegative()
    .describe("Index of the existing condition within that group (0-based)."),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "0–1 confidence that this condition contradicts the tooltip. Use below 0.5 when the reading is ambiguous.",
    ),
  reason: z
    .string()
    .min(1)
    .max(200)
    .describe(
      "One short sentence for a non-technical user. Quote the tooltip phrase and the conflicting condition wording. Never use raw operator IDs.",
    ),
  suggested: tooltipSuggestionPatchSchema.describe(
    "Operator and/or value to write back. Never change entity or attribute.",
  ),
});

const payoutFixSchema = z.object({
  scope: z
    .enum(["default", "group"])
    .describe(
      "default is the payout when no condition matches. group is one condition group's payout.",
    ),
  modifierIndex: z
    .number()
    .int()
    .nonnegative()
    .nullish()
    .describe(
      "Required when scope is group. The condition group's modifierIndex.",
    ),
  amount: z
    .number()
    .nonnegative()
    .nullish()
    .describe(
      "New amount in dollars for a flat payout, or percent for a percentage payout. Omit to keep the current amount.",
    ),
  maxDuration: z
    .number()
    .int()
    .min(0)
    .max(600)
    .nullable()
    .optional()
    .describe(
      "0 = one time, null = for the customer's lifetime, a positive integer = that many months. Omit to keep the current duration.",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "0–1 confidence that the copy states this amount or duration. Use below 0.5 when the reading is ambiguous.",
    ),
  reason: z
    .string()
    .min(1)
    .max(300)
    .describe(
      "One short sentence quoting the copy and the payout it disagrees with. Never use raw field names.",
    ),
});

export const reviewRewardTooltipOutputSchema = z.object({
  suggestions: z
    .array(tooltipSuggestionSchema)
    .describe(
      "Condition operator or value fixes. Empty when no existing condition should change.",
    ),
  payoutFixes: z
    .array(payoutFixSchema)
    .describe(
      "Amount or duration changes so a payout matches the partner copy. One entry per payout that disagrees. Empty when every payout already matches, or when you cannot name the replacement amount or duration.",
    ),
  note: z
    .string()
    .max(300)
    .nullish()
    .describe(
      "One sentence when the copy disagrees with a payout and you cannot name the replacement amount or duration. Null when suggestions or payoutFixes is non-empty.",
    ),
});

const reviewRewardTooltipConditionSchema = z.object({
  entity: z.string(),
  attribute: z.string(),
  operator: z.enum(CONDITION_OPERATORS),
  value: tooltipSuggestionValueSchema,
  label: z.string().nullish(),
  metadataField: z.string().optional(),
});

const rewardPayoutSchema = z.object({
  type: z.enum(["flat", "percentage"]),
  amount: z.number().nullish(),
  maxDuration: z.number().int().nonnegative().nullish(),
});

const reviewRewardTooltipModifierSchema = z.object({
  operator: z.enum(["AND", "OR"]).default("AND"),
  conditions: z.array(reviewRewardTooltipConditionSchema).min(1),
  payout: rewardPayoutSchema,
});

export const reviewRewardTooltipInputSchema = z.object({
  workspaceId: z.string(),
  event: z.enum(AI_REWARD_EVENTS),
  tooltip: z.string().min(1).max(4000),
  description: z.string().nullish(),
  basePayout: rewardPayoutSchema,
  modifiers: z.array(reviewRewardTooltipModifierSchema).min(1),
});

export type TooltipSuggestion = z.infer<typeof tooltipSuggestionSchema>;
export type TooltipSuggestionPatch = z.infer<
  typeof tooltipSuggestionPatchSchema
>;
export type PayoutFix = z.infer<typeof payoutFixSchema>;
export type ReviewRewardTooltipModifier = z.infer<
  typeof reviewRewardTooltipModifierSchema
>;
export type RewardPayout = z.infer<typeof rewardPayoutSchema>;
