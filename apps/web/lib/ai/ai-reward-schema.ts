import { CONDITION_OPERATORS } from "@/lib/zod/schemas/rewards";
import { RewardStructure } from "@prisma/client";
import * as z from "zod/v4";

export const AI_REWARD_EVENTS = ["click", "lead", "sale"] as const;

export const aiRewardConditionSchema = z.object({
  entity: z
    .enum(["partner", "customer", "sale", "lead"])
    .describe("The entity to evaluate (customer, partner, sale, or lead)."),
  attribute: z
    .string()
    .describe("The attribute on the entity (e.g. country, amount, source)."),
  operator: z
    .enum(CONDITION_OPERATORS)
    .describe("Comparison operator for the condition."),
  value: z
    .union([z.string(), z.number(), z.array(z.string()), z.array(z.number())])
    .describe(
      "Condition value. For currency attributes use dollars (not cents). For country use ISO country codes (e.g. US). For enums use the option id.",
    ),
  label: z
    .string()
    .nullish()
    .describe("Optional display label (e.g. product name for productId)."),
  metadataField: z
    .string()
    .optional()
    .describe("Required when attribute is metadata — the metadata key name."),
});

export const aiRewardModifierSchema = z.object({
  operator: z
    .enum(["AND", "OR"])
    .default("AND")
    .describe("How conditions in this group combine."),
  conditions: z
    .array(aiRewardConditionSchema)
    .min(1)
    .describe("Conditions that must match for this alternate reward."),
  type: z
    .enum(RewardStructure)
    .optional()
    .describe(
      "Reward structure for this group. Omit to inherit the base reward type.",
    ),
  amount: z
    .number()
    .optional()
    .describe(
      "Reward amount for this group. Flat = dollars; percentage = 0–100. Omit to inherit base amount.",
    ),
  maxDuration: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional()
    .describe(
      "Duration in months for sale rewards. null = lifetime. Omit to inherit base. Click/lead ignore this.",
    ),
});

/** AI output schema — amounts in form units (dollars for flat, percent for percentage). */
export const aiRewardSchema = z.object({
  type: z
    .enum(RewardStructure)
    .describe(
      "Base reward structure. Click and lead rewards must be flat. Sale may be flat or percentage.",
    ),
  amount: z
    .number()
    .describe(
      "Base reward amount. Flat = dollars (e.g. 10 for $10); percentage = 0–100 (e.g. 20 for 20%).",
    ),
  maxDuration: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe(
      "Base duration in months for sale rewards. null = customer's lifetime. Click/lead must be 0.",
    ),
  modifiers: z
    .array(aiRewardModifierSchema)
    .optional()
    .describe(
      "Optional conditional reward groups. Omit or use [] when there are no conditions.",
    ),
});

export type AIRewardDraft = z.infer<typeof aiRewardSchema>;
