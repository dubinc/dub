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
});

export const updateDiscountSchema = createDiscountSchema
  .pick({
    workspaceId: true,
    couponTestId: true,
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

export const DiscountCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  discountId: z.string().nullable(),
  partnerId: z.string(),
  linkId: z.string(),
});

export const createDiscountCodeSchema = z.object({
  code: z
    .string()
    .max(100, "Code must be less than 100 characters.")
    .optional(),
  partnerId: z.string(),
  linkId: z.string(),
});

export const getDiscountCodesQuerySchema = z.object({
  partnerId: z.string(),
});
