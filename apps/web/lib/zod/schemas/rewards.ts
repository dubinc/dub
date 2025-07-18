import { EventType, RewardStructure } from "@dub/prisma/client";
import { z } from "zod";
import { getPaginationQuerySchema, maxDurationSchema } from "./misc";

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

export const rewardConditionSchema = z.object({
  entity: z.enum(["customer", "sale"]),
  attribute: z.enum(["country", "productId"]),
  operator: z.enum([
    "equals_to",
    "not_equals",
    "starts_with",
    "ends_with",
    "in",
    "not_in",
  ]),
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
});

export const rewardConditionsSchema = z.object({
  operator: z.enum(["AND", "OR"]).default("AND"),
  conditions: z.array(rewardConditionSchema).min(1),
  amount: z.number().int().min(0),
});

export const rewardConditionsArraySchema = z
  .array(rewardConditionsSchema)
  .min(1);

export const rewardContextSchema = z.object({
  customer: z
    .object({
      country: z.string().nullish(),
    })
    .optional(),

  sale: z
    .object({
      productId: z.string().nullish(),
    })
    .optional(),
});

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
  modifiers: rewardConditionsArraySchema.nullish(),
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
