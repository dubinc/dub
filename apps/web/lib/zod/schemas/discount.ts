import { CommissionType } from "@dub/prisma/client";
import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";
import { RECURRING_MAX_DURATIONS } from "./rewards";

export const DiscountSchema = z.object({
  id: z.string(),
  amount: z.number().nullable(),
  type: z.nativeEnum(CommissionType),
  maxDuration: z.number().nullable(),
  couponId: z.string().nullable(),
  couponTestId: z.string().nullable(),
  partnersCount: z.number().nullish(),
});

const baseDiscountSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerIds: z.array(z.string()).nullish(),
});

const manualDiscountSchema = baseDiscountSchema.extend({
  discountSource: z.literal("manual"),
  amount: z.number().min(0),
  type: z.nativeEnum(CommissionType).default("flat"),
  maxDuration: z.coerce
    .number()
    .refine((val) => RECURRING_MAX_DURATIONS.includes(val), {
      message: `Max duration must be ${RECURRING_MAX_DURATIONS.join(", ")}`,
    })
    .nullish(),
});

const stripeDiscountSchema = baseDiscountSchema.extend({
  discountSource: z.literal("stripe"),
  couponId: z.string(),
  couponTestId: z.string().nullish(),
});

export const createDiscountSchema = z.discriminatedUnion("discountSource", [
  manualDiscountSchema,
  stripeDiscountSchema,
]);

export const updateDiscountSchema = z.discriminatedUnion("discountSource", [
  manualDiscountSchema.extend({ discountId: z.string() }),
  stripeDiscountSchema.extend({ discountId: z.string() }),
]);

export const discountPartnersQuerySchema = z
  .object({
    discountId: z.string(),
  })
  .merge(
    getPaginationQuerySchema({
      pageSize: 25,
    }),
  );
