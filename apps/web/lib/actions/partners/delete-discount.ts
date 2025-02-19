"use server";

import { DubApiError } from "@/lib/api/errors";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const deleteDiscountSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  discountId: z.string(),
});

export const deleteDiscountAction = authActionClient
  .schema(deleteDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, discountId } = parsedInput;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    await getDiscountOrThrow({
      discountId,
      programId,
    });

    if (program.defaultDiscountId === discountId) {
      throw new DubApiError({
        code: "bad_request",
        message: "This is a default discount and cannot be deleted.",
      });
    }

    await prisma.discount.delete({
      where: {
        id: discountId,
      },
    });
  });
