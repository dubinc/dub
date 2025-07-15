import { EventType, RewardStructure } from "@dub/prisma/client";
import { z } from "zod";
import { getPaginationQuerySchema, maxDurationSchema } from "./misc";

///// Reward modifier schema //////

const operatorTypeSchema = z.enum([
  "equals_to",
  "not_equals",
  "in",
  "not_in",
  "starts_with",
  "ends_with",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
]);

const logicOperatorSchema = z.enum(["AND", "OR"]);

const fieldTypeSchema = z.enum(["customer", "sale"]);

const fieldSchema = z.enum(["country", "productId"]);

// A condition can be met if the field value matches the value
export const rewardConditionSchema = z.object({
  type: fieldTypeSchema,
  field: fieldSchema,
  operator: operatorTypeSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
});

// A modifier can have multiple conditions that must be met for the modifier to be applied
export const rewardModifierSchema = z.object({
  operator: logicOperatorSchema,
  amount: z.number().int().min(0),
  conditions: z.array(rewardConditionSchema).min(1),
});

// The context in which a reward modifier is evaluated
export const rewardContextSchema = z.object({
  customer: z
    .object({
      country: z.string().nullable(),
    })
    .optional(),

  sale: z
    .object({
      productId: z.string().nullable(),
    })
    .optional(),
});

export const COMMISSION_TYPES = [
  {
    value: "one-off",
    label: "One-off",
    description: "Pay a one-time payout",
  },
  {
    value: "recurring",
    label: "Recurring",
    description: "Pay an ongoing payout",
  },
] as const;

export const RewardSchema = z.object({
  id: z.string(),
  event: z.nativeEnum(EventType),
  name: z.string().nullish(),
  description: z.string().nullish(),
  type: z.nativeEnum(RewardStructure),
  amount: z.number(),
  maxDuration: z.number().nullish(),
  maxAmount: z.number().nullish(),
  default: z.boolean(),
  modifiers: z.array(rewardModifierSchema).nullish(),
});

export const createOrUpdateRewardSchema = z.object({
  workspaceId: z.string(),
  event: z.nativeEnum(EventType),
  type: z.nativeEnum(RewardStructure).default(RewardStructure.flat),
  amount: z.number().min(0),
  maxDuration: maxDurationSchema,
  isDefault: z.boolean(),
  includedPartnerIds: z
    .array(z.string())
    .nullish()
    .describe("Only applicable for non-default rewards"),
  excludedPartnerIds: z
    .array(z.string())
    .nullish()
    .describe("Only applicable for default rewards"),
  modifiers: z.array(rewardModifierSchema).optional(),
});

export const createRewardSchema = createOrUpdateRewardSchema.superRefine(
  (data) => {
    if (data.event !== EventType.sale) {
      data.maxDuration = 0;
      data.type = "flat";
    }
  },
);

export const updateRewardSchema = createOrUpdateRewardSchema
  .omit({
    event: true,
    isDefault: true,
  })
  .merge(
    z.object({
      rewardId: z.string(),
    }),
  );

export const rewardPartnersQuerySchema = z
  .object({
    rewardId: z.string(),
  })
  .merge(
    getPaginationQuerySchema({
      pageSize: 25,
    }),
  );

export const REWARD_EVENT_COLUMN_MAPPING = Object.freeze({
  click: "clickRewardId",
  lead: "leadRewardId",
  sale: "saleRewardId",
});
