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
  "country",
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
  customer: {
    country: "string",
  },
  partner: {
    country: "string",
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

export const PERCENTAGE_REWARD_AMOUNT_SCHEMA = z
  .number()
  .min(0, { message: "Reward percentage amount cannot be less than 0%" })
  .max(100, {
    message: "Reward percentage amount cannot be greater than 100%",
  });

export const FLAT_REWARD_AMOUNT_SCHEMA = z
  .number()
  .int()
  .min(0, { message: "Reward amount cannot be less than $0" })
  .max(999_999_99, {
    message: "Reward amount cannot be greater than $999,999.99",
  });

export const rewardConditionsSchema = z.object({
  operator: z.enum(["AND", "OR"]).default("AND"),
  conditions: z.array(rewardConditionSchema).min(1),
  amountInCents: FLAT_REWARD_AMOUNT_SCHEMA.optional(),
  amountInPercentage: PERCENTAGE_REWARD_AMOUNT_SCHEMA.optional(),
  type: z.nativeEnum(RewardStructure).optional(),
  maxDuration: maxDurationSchema,
});

export const rewardConditionsArraySchema = z
  .array(rewardConditionsSchema)
  .min(1);

const decimalToNumber = z
  .any()
  .transform((val) => (val != null && val !== "" ? Number(val) : null))
  .nullable()
  .optional();

export const RewardSchema = z.object({
  id: z.string(),
  event: z.nativeEnum(EventType),
  description: z.string().nullish(),
  tooltipDescription: z.string().nullish(),
  type: z.nativeEnum(RewardStructure),
  amountInCents: z.number().int().nullable().optional(),
  amountInPercentage: decimalToNumber,
  maxDuration: z.number().nullish(),
  modifiers: z.any().nullish(), // TODO: Fix this
});

export const REWARD_DESCRIPTION_MAX_LENGTH = 100;
export const REWARD_TOOLTIP_DESCRIPTION_MAX_LENGTH = 2000;

export const createOrUpdateRewardSchema = z.object({
  workspaceId: z.string(),
  event: z.nativeEnum(EventType),
  type: z.nativeEnum(RewardStructure).default(RewardStructure.flat),
  amountInCents: FLAT_REWARD_AMOUNT_SCHEMA.optional(),
  amountInPercentage: PERCENTAGE_REWARD_AMOUNT_SCHEMA.optional(),
  maxDuration: maxDurationSchema,
  modifiers: rewardConditionsArraySchema.nullish(),
  description: z.string().max(REWARD_DESCRIPTION_MAX_LENGTH).nullish(),
  tooltipDescription: z
    .string()
    .max(REWARD_TOOLTIP_DESCRIPTION_MAX_LENGTH)
    .nullish(),
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
      country: z.string().nullish(),
      totalClicks: z.number().nullish(),
      totalLeads: z.number().nullish(),
      totalConversions: z.number().nullish(),
      totalSaleAmount: z.number().nullish(),
      totalCommissions: z.number().nullish(),
    })
    .optional(),
});
