"use server";

import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
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

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    await getDiscountOrThrow({
      discountId,
      programId,
    });

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
