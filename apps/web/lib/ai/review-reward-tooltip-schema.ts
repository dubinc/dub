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

export const reviewRewardTooltipOutputSchema = z.object({
  suggestions: z
    .array(tooltipSuggestionSchema)
    .describe(
      "Contradictions on existing conditions. Empty if the tooltip and conditions agree, or if you are unsure.",
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

const reviewRewardTooltipModifierSchema = z.object({
  operator: z.enum(["AND", "OR"]).default("AND"),
  conditions: z.array(reviewRewardTooltipConditionSchema).min(1),
});

export const reviewRewardTooltipInputSchema = z.object({
  workspaceId: z.string(),
  event: z.enum(AI_REWARD_EVENTS),
  tooltip: z.string().min(1).max(4000),
  modifiers: z.array(reviewRewardTooltipModifierSchema).min(1),
});

export type TooltipSuggestion = z.infer<typeof tooltipSuggestionSchema>;
export type TooltipSuggestionPatch = z.infer<
  typeof tooltipSuggestionPatchSchema
>;
export type ReviewRewardTooltipModifier = z.infer<
  typeof reviewRewardTooltipModifierSchema
>;
