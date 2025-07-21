"use server";

import { deleteDiscount } from "@/lib/api/partners/delete-discount";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const deleteDiscountSchema = z.object({
  workspaceId: z.string(),
  discountId: z.string(),
});

export const deleteDiscountAction = authActionClient
  .schema(deleteDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { discountId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discount = await getDiscountOrThrow({
      programId,
      discountId,
    });

    await deleteDiscount({
      workspace,
      discount,
      user,
    });
  });
