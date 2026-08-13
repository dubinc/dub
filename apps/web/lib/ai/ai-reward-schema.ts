import {
  CONDITION_OPERATORS,
  isOneOffRewardEvent,
  REWARD_CONDITIONS,
} from "@/lib/zod/schemas/rewards";
import { RewardStructure } from "@prisma/client";
import * as z from "zod/v4";

export const AI_REWARD_EVENTS = ["click", "lead", "sale"] as const;
export type AIRewardEvent = (typeof AI_REWARD_EVENTS)[number];

const REWARD_CONDITION_ENTITY_IDS = [
  ...new Set(
    AI_REWARD_EVENTS.flatMap((event) =>
      REWARD_CONDITIONS[event].entities.map((entity) => entity.id),
    ),
  ),
] as [string, ...string[]];

function buildConditionSchema(entityIds: [string, ...string[]]) {
  return z.object({
    entity: z
      .enum(entityIds)
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
      .describe(
        "Optional display label for the reward (e.g. product name for productId).",
      ),
    metadataField: z
      .string()
      .optional()
      .describe("Required when attribute is metadata — the metadata key name."),
  });
}

type ConditionSchema = ReturnType<typeof buildConditionSchema>;

/** Plain object shape for model JSON-schema steering (no refinements). */
function buildModifierObjectSchema(conditionSchema: ConditionSchema) {
  return z.object({
    operator: z
      .enum(["AND", "OR"])
      .default("AND")
      .describe("How conditions in this group combine."),
    conditions: z
      .array(conditionSchema)
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
      .nonnegative()
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
        "Duration in months for sale rewards. null = lifetime. Omit to inherit base.",
      ),
  });
}

type ModifierObjectSchema = ReturnType<typeof buildModifierObjectSchema>;

function buildRewardObjectSchema(modifierSchema: ModifierObjectSchema) {
  return z.object({
    type: z
      .enum(RewardStructure)
      .describe(
        "Base reward structure. Click and lead rewards must be flat. Sale may be flat or percentage.",
      ),
    amount: z
      .number()
      .nonnegative()
      .describe(
        "Base reward amount. Flat = dollars (e.g. 10 for $10); percentage = 0–100 (e.g. 20 for 20%).",
      ),
    maxDuration: z
      .number()
      .int()
      .nonnegative()
      .nullish()
      .describe(
        "Base duration in months for sale rewards. null = customer's lifetime. One-time sale rewards must be 0, same as click and lead rewards.",
      ),
    modifiers: z
      .array(modifierSchema)
      .optional()
      .describe(
        "Optional conditional reward groups. Omit or use [] when there are no conditions.",
      ),
  });
}

type RewardObjectSchema = ReturnType<typeof buildRewardObjectSchema>;

function withPercentageLimits(schema: RewardObjectSchema) {
  return schema
    .refine((data) => data.type !== "percentage" || data.amount <= 100, {
      message: "Percentage amount must be between 0 and 100.",
      path: ["amount"],
    })
    .refine(
      (data) =>
        (data.modifiers ?? []).every((modifier) => {
          const type = modifier.type ?? data.type;
          return (
            type !== "percentage" ||
            modifier.amount == null ||
            modifier.amount <= 100
          );
        }),
      {
        message: "Percentage amount must be between 0 and 100.",
        path: ["modifiers"],
      },
    );
}

function buildEventRewardObjectSchema(event: AIRewardEvent) {
  const entityIds = REWARD_CONDITIONS[event].entities.map(
    (entity) => entity.id,
  ) as [string, ...string[]];

  return buildRewardObjectSchema(
    buildModifierObjectSchema(buildConditionSchema(entityIds)),
  );
}

const aiRewardSchema = withPercentageLimits(
  buildRewardObjectSchema(
    buildModifierObjectSchema(
      buildConditionSchema(REWARD_CONDITION_ENTITY_IDS),
    ),
  ),
);

export type AIRewardDraft = z.infer<typeof aiRewardSchema>;

/** Event-aware schema for final draft validation. */
export function getAIRewardSchema(event: AIRewardEvent) {
  let schema = withPercentageLimits(buildEventRewardObjectSchema(event));

  if (isOneOffRewardEvent(event)) {
    schema = schema.refine(
      (data) => {
        if (data.type !== "flat") return false;
        if (!(data.maxDuration == null || data.maxDuration === 0)) return false;

        return (data.modifiers ?? []).every(
          (modifier) =>
            (modifier.type == null || modifier.type === "flat") &&
            (modifier.maxDuration == null || modifier.maxDuration === 0),
        );
      },
      { message: "Click and lead rewards must be flat with duration 0." },
    );
  }

  return schema.superRefine((data, ctx) => {
    data.modifiers?.forEach((modifier, modifierIndex) => {
      modifier.conditions.forEach((condition, conditionIndex) => {
        const entity = REWARD_CONDITIONS[event].entities.find(
          (entry) => entry.id === condition.entity,
        );
        const attribute = entity?.attributes.find(
          (entry) => entry.id === condition.attribute,
        );
        const valid =
          attribute != null &&
          (attribute.type !== "metadata" || Boolean(condition.metadataField));

        if (valid) return;

        ctx.addIssue({
          code: "custom",
          message: `Condition uses an entity/attribute not allowed for ${event} rewards.`,
          path: ["modifiers", modifierIndex, "conditions", conditionIndex],
        });
      });
    });
  });
}

/**
 * Model structured-output envelope. Reward is a plain object for JSON-schema
 * steering; app rules are enforced via getAIRewardSchema in superRefine.
 */
export function getAIRewardGenerationSchema(event: AIRewardEvent) {
  return z
    .object({
      supported: z
        .boolean()
        .describe(
          "True only if the request can be expressed accurately with the allowed entities/attributes. False if any important part would require guessing, stretching meanings, or inventing fields.",
        ),
      reason: z
        .string()
        .nullish()
        .describe(
          "When supported is false: brief explanation of what is not supported. When supported is true: null or omit.",
        ),
      reward: buildEventRewardObjectSchema(event)
        .nullish()
        .describe(
          "When supported is true: the reward configuration. When supported is false: null or omit.",
        ),
    })
    .superRefine((data, ctx) => {
      if (!data.supported) return;

      if (data.reward == null) {
        ctx.addIssue({
          code: "custom",
          message: "Reward is required when supported is true.",
          path: ["reward"],
        });
        return;
      }

      const parsed = getAIRewardSchema(event).safeParse(data.reward);
      if (parsed.success) return;

      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: "custom",
          message: issue.message,
          path: ["reward", ...issue.path],
        });
      }
    });
}

export type AIRewardGenerationOutput = z.infer<
  ReturnType<typeof getAIRewardGenerationSchema>
>;

export function getAIRewardConditionEntityIds() {
  return REWARD_CONDITION_ENTITY_IDS;
}
