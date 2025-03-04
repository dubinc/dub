import { CommissionType } from "@dub/prisma/client";
import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";
import { RECURRING_MAX_DURATIONS } from "./rewards";

export const DiscountSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.nativeEnum(CommissionType),
  maxDuration: z.number().nullable(),
  couponId: z.string().nullable(),
  couponTestId: z.string().nullable(),
  partnersCount: z.number().nullish(),
});

export const createDiscountSchema = z.object({
  amount: z.number().min(0),
  type: z.nativeEnum(CommissionType).default("flat"),
  maxDuration: z.coerce
    .number()
    .refine((val) => RECURRING_MAX_DURATIONS.includes(val), {
      message: `Max duration must be ${RECURRING_MAX_DURATIONS.join(", ")}`,
    })
    .nullish(),
  partnerIds: z.array(z.string()).nullish(),
  workspaceId: z.string(),
  programId: z.string(),
});

export const updateDiscountSchema = createDiscountSchema.merge(
  z.object({
    discountId: z.string(),
  }),
);

export const discountPartnersQuerySchema = z
  .object({
    discountId: z.string(),
  })
  .merge(
    getPaginationQuerySchema({
      pageSize: 25,
    }),
  );
