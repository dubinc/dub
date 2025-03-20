"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
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
    const { workspace, user } = ctx;
    const { programId, discountId } = parsedInput;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const discount = await getDiscountOrThrow({
      programId,
      discountId,
    });

    await prisma.$transaction(async (tx) => {
      // if this is the default discount, set the program default discount to null
      if (program.defaultDiscountId === discountId) {
        await tx.program.update({
          where: { id: programId },
          data: { defaultDiscountId: null },
        });
      }
      // update all program enrollments to have no discount
      await tx.programEnrollment.updateMany({
        where: {
          discountId,
        },
        data: {
          discountId: null,
        },
      });
      // delete the discount
      await tx.discount.delete({
        where: {
          id: discountId,
        },
      });
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId: program.id,
        event: "discount.delete",
        actor: user,
        targets: [
          {
            type: "discount",
            id: discount.id,
            metadata: discount,
          },
        ],
      }),
    );
  });
