import { RewardStructure } from "@dub/prisma/client";
import { z } from "zod";
import { getPaginationQuerySchema, maxDurationSchema } from "./misc";

export const DiscountSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.nativeEnum(RewardStructure),
  maxDuration: z.number().nullable(),
  description: z.string().nullish(),
  couponId: z.string().nullable(),
  couponTestId: z.string().nullable(),
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
  .omit({
    groupId: true,
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
