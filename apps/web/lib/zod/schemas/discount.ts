import { RewardStructure } from "@dub/prisma/client";
import { z } from "zod";
import { getPaginationQuerySchema, maxDurationSchema } from "./misc";

export const DiscountSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.nativeEnum(RewardStructure),
  maxDuration: z.number().nullable(),
  couponId: z.string().nullable(),
  couponTestId: z.string().nullable(),
  description: z.string().nullish(),
  partnersCount: z.number().nullish(),
  couponCodeTrackingEnabledAt: z.date().nullish(),
});

export const DiscountSchemaWithDeprecatedFields = DiscountSchema.extend({
  duration: z
    .number()
    .nullish()
    .describe("Deprecated: Use `maxDuration` instead"),
  interval: z.string().nullish().describe("Deprecated: Defaults to `month`"),
}).nullish();

export const createDiscountSchema = z.object({
  workspaceId: z.string(),
  amount: z.number().min(0),
  type: z.nativeEnum(RewardStructure).default("flat"),
  maxDuration: maxDurationSchema,
  couponId: z.string(),
  couponTestId: z.string().nullish(),
  groupId: z.string(),
  enableCouponTracking: z.boolean().default(false),
});

export const updateDiscountSchema = createDiscountSchema
  .pick({
    workspaceId: true,
    couponTestId: true,
    enableCouponTracking: true,
  })
  .extend({
    discountId: z.string(),
  });

export const discountPartnersQuerySchema = z
  .object({
    discountId: z.string(),
  })
  .merge(
    getPaginationQuerySchema({
      pageSize: 25,
    }),
  );

// Discount codes
export const DiscountCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  discountId: z.string(),
  partnerId: z.string(),
  linkId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const getDiscountCodesQuerySchema = z.object({
  partnerId: z.string(),
});

export const createDiscountCodeSchema = z.object({
  code: z.string().optional(),
  partnerId: z.string(),
  linkId: z.string(),
});
