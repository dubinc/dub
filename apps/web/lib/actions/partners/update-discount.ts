"use server";

import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { updateDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

export const updateDiscountAction = authActionClient
  .schema(updateDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, partnerIds, discountId, amount, maxDuration } =
      parsedInput;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const discount = await prisma.discount.findUniqueOrThrow({
      where: {
        id: discountId,
      },
    });

    if (discount.workspaceId !== workspace.id) {
      throw new Error("Discount not found");
    }

    let programEnrollments: { id: string }[] = [];

    if (partnerIds) {
      programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          partnerId: {
            in: partnerIds,
          },
        },
        select: {
          id: true,
        },
      });

      if (programEnrollments.length !== partnerIds.length) {
        throw new Error("Invalid partner IDs provided.");
      }
    }

    await prisma.discount.update({
      where: {
        id: discountId,
      },
      data: {
        amount,
        maxDuration,
        ...(programEnrollments && {
          partners: {
            createMany: {
              data: programEnrollments.map(({ id }) => ({
                programEnrollmentId: id,
              })),
            },
          },
        }),
      },
    });
  });
