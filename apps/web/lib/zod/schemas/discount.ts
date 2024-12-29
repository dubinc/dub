import { CommissionInterval, CommissionType } from "@dub/prisma/client";
import { z } from "zod";

export const DiscountSchema = z.object({
  couponId: z.string().nullable(),
  couponTestId: z.string().nullable(),
  amount: z.number(),
  type: z.nativeEnum(CommissionType),
  duration: z.number().nullable(),
  interval: z.nativeEnum(CommissionInterval).nullable(),
});
