import { DiscountProvider, RewardStructure } from "@prisma/client";
import * as z from "zod/v4";
import { getPaginationQuerySchema, maxDurationSchema } from "./misc";

export const DiscountSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.enum(RewardStructure),
  maxDuration: z.number().nullable(),
  couponId: z.string().nullable(),
  couponTestId: z.string().nullable(),
  description: z.string().nullish(),
  partnersCount: z.number().nullish(),
  autoProvisionEnabledAt: z.coerce.date().nullish(),
  provider: z.enum(DiscountProvider),
});

export const DiscountSchemaWithDeprecatedFields = DiscountSchema.omit({
  autoProvisionEnabledAt: true,
  provider: true,
})
  .extend({
    duration: z
      .number()
      .nullish()
      .describe("Deprecated: Use `maxDuration` instead"),
    interval: z.string().nullish().describe("Deprecated: Defaults to `month`"),
  })
  .nullish();

export const createDiscountSchema = z.object({
  workspaceId: z.string(),
  amount: z.number().min(0),
  type: z.enum(RewardStructure).default("flat"),
  maxDuration: maxDurationSchema,
  couponId: z.string(),
  couponTestId: z.string().nullish(),
  groupId: z.string(),
  autoProvision: z.boolean().optional(),
  provider: z.enum(DiscountProvider),
});

export const updateDiscountSchema = createDiscountSchema
  .pick({
    workspaceId: true,
    couponTestId: true,
    autoProvision: true,
  })
  .extend({
    discountId: z.string(),
  });

export const discountPartnersQuerySchema = z
  .object({
    discountId: z.string(),
  })
  .extend(getPaginationQuerySchema({ pageSize: 25 }));

export const DiscountCodeSchema = z
  .object({
    id: z.string().describe("The unique ID of the discount code.").meta({
      example: "dcode_1JVR7XRCSR0EDBAF39FZ4PMYE",
    }),
    code: z
      .string()
      .describe("The discount code that customers can apply at checkout.")
      .meta({
        example: "PARTNER10OFF",
      }),
    discountId: z
      .string()
      .nullable()
      .describe("The ID of the discount this code belongs to."),
    partnerId: z
      .string()
      .describe("The ID of the partner this discount code is assigned to."),
    linkId: z
      .string()
      .describe(
        "The ID of the partner's referral link this discount code is associated with.",
      ),
    disabledAt: z.coerce
      .date()
      .nullish()
      .describe(
        "When this discount code was disabled, which happens when a partner is banned or deactivated.",
      ),
  })
  .meta({
    title: "DiscountCode",
  });

export const createDiscountCodeSchema = z.object({
  code: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z
      .string()
      .trim()
      .max(100, "Code must be 100 characters or fewer.")
      .regex(
        /^[a-zA-Z0-9\-_]+$/,
        "Code can only contain letters, numbers, dashes, and underscores.",
      )
      .optional()
      .describe(
        "The discount code to create. If omitted, a unique code will be generated automatically from the partner's name.",
      ),
  ),
  partnerId: z
    .string()
    .describe("The ID of the partner to create a discount code for."),
  linkId: z
    .string()
    .describe(
      "The ID of the partner's referral link to associate this discount code with. Each link can only have one discount code.",
    ),
});

export const getDiscountCodesQuerySchema = z.object({
  partnerId: z
    .string()
    .describe("The ID of the partner to retrieve discount codes for."),
});
