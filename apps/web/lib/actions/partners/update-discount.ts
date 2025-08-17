"use server";

import { updateDiscountSchema } from "@/lib/zod/schemas/discount";
import { authActionClient } from "../safe-action";

export const updateDiscountAction = authActionClient
  .schema(updateDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    // TODO:
    // Remove this, Stripe coupon can't be updated
  });
