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

export const CONDITION_ENTITIES = ["customer", "sale", "partner"] as const;

export const CONDITION_CUSTOMER_ATTRIBUTES = ["country"] as const;

export const CONDITION_SALE_ATTRIBUTES = ["productId", "amount"] as const;

export const CONDITION_PARTNER_ATTRIBUTES = [
  "totalClicks",
  "totalLeads",
  "totalConversions",
  "totalSaleAmount",
  "totalCommissions",
] as const;

export const CONDITION_ATTRIBUTES = [
  ...CONDITION_CUSTOMER_ATTRIBUTES,
  ...CONDITION_SALE_ATTRIBUTES,
  ...CONDITION_PARTNER_ATTRIBUTES,
] as const;

export const ENTITY_ATTRIBUTE_TYPES: Partial<
  Record<
    (typeof CONDITION_ENTITIES)[number],
    Partial<
      Record<
        (typeof CONDITION_ATTRIBUTES)[number],
        "string" | "number" | "currency"
      >
    >
  >
> = {
  partner: {
    totalClicks: "number",
    totalLeads: "number",
    totalConversions: "number",
    totalSaleAmount: "currency",
    totalCommissions: "currency",
  },
  sale: {
    amount: "currency",
  },
};

export const CONDITION_OPERATORS = [
  "equals_to",
  "not_equals",
  "starts_with",
  "ends_with",
  "in",
  "not_in",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
] as const;

export const STRING_CONDITION_OPERATORS: (typeof CONDITION_OPERATORS)[number][] =
  ["equals_to", "not_equals", "starts_with", "ends_with", "in", "not_in"];

export const NUMBER_CONDITION_OPERATORS: (typeof CONDITION_OPERATORS)[number][] =
  [
    "equals_to",
    "not_equals",
    "greater_than",
    "greater_than_or_equal",
    "less_than",
    "less_than_or_equal",
  ];

export const ATTRIBUTE_LABELS = {
  country: "Country",
  productId: "Product ID",
  amount: "Amount",
  totalClicks: "Total clicks",
  totalLeads: "Total leads",
  totalConversions: "Total conversions",
  totalSaleAmount: "Total revenue",
  totalCommissions: "Total commissions",
} as const;

export const CONDITION_OPERATOR_LABELS = {
  equals_to: "is",
  not_equals: "is not",
  starts_with: "starts with",
  ends_with: "ends with",
  in: "is one of",
  not_in: "is not one of",
  greater_than: "is greater than",
  greater_than_or_equal: "is greater than or equal to",
  less_than: "is less than",
  less_than_or_equal: "is less than or equal to",
} as const;

export const rewardConditionSchema = z.object({
  entity: z.enum(CONDITION_ENTITIES),
  attribute: z.enum(CONDITION_ATTRIBUTES),
  operator: z.enum(CONDITION_OPERATORS),
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
  label: z
    .string()
    .nullish()
    .describe("Product name used for display purposes in the UI."),
});

export const rewardConditionsSchema = z.object({
  operator: z.enum(["AND", "OR"]).default("AND"),
  conditions: z.array(rewardConditionSchema).min(1),
  amount: z.number().int().min(0),
  type: z.nativeEnum(RewardStructure).optional(),
  maxDuration: maxDurationSchema,
});

export const rewardConditionsArraySchema = z
  .array(rewardConditionsSchema)
  .min(1);

export const RewardSchema = z.object({
  id: z.string(),
  event: z.nativeEnum(EventType),
  description: z.string().nullish(),
  type: z.nativeEnum(RewardStructure),
  amount: z.number(),
  maxDuration: z.number().nullish(),
  modifiers: z.any().nullish(), // TODO: Fix this
});

export const createOrUpdateRewardSchema = z.object({
  workspaceId: z.string(),
  event: z.nativeEnum(EventType),
  type: z.nativeEnum(RewardStructure).default(RewardStructure.flat),
  amount: z.number().min(0),
  maxDuration: maxDurationSchema,
  modifiers: rewardConditionsArraySchema.nullish(),
  description: z.string().max(100).nullish(),
  groupId: z.string(),
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
    groupId: true,
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

export const rewardContextSchema = z.object({
  customer: z
    .object({
      country: z.string().nullish(),
    })
    .optional(),

  sale: z
    .object({
      productId: z.string().nullish(),
      amount: z.number().nullish(),
    })
    .optional(),

  partner: z
    .object({
      totalClicks: z.number().nullish(),
      totalLeads: z.number().nullish(),
      totalConversions: z.number().nullish(),
      totalSaleAmount: z.number().nullish(),
      totalCommissions: z.number().nullish(),
    })
    .optional(),
});
