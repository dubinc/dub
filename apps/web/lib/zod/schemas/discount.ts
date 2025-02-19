import { CommissionInterval, CommissionType } from "@dub/prisma/client";
import { z } from "zod";
import { RECURRING_MAX_DURATIONS } from "./rewards";

export const DiscountSchema = z.object({
  id: z.string(),
  couponId: z.string().nullable(),
  couponTestId: z.string().nullable(),
  amount: z.number(),
  type: z.nativeEnum(CommissionType),
  duration: z.number().nullable(),
  interval: z.nativeEnum(CommissionInterval).nullable(),
});

export const createDiscountSchema = z.object({
  amount: z.number().min(0),
  maxDuration: z.coerce
    .number()
    .refine((val) => RECURRING_MAX_DURATIONS.includes(val), {
      message: `Max duration must be ${RECURRING_MAX_DURATIONS.join(", ")}`,
    })
    .nullish(),
  isDefault: z.boolean().optional().default(false),
  partnerIds: z.array(z.string()).nullish(),
  workspaceId: z.string(),
  programId: z.string(),
});

export const updateDiscountSchema = createDiscountSchema.merge(
  z.object({
    discountId: z.string(),
  }),
);
