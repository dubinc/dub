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
    const {
      programId,
      discountId,
      partnerIds,
      amount,
      type,
      maxDuration,
      couponId,
      couponTestId,
    } = parsedInput;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    await getDiscountOrThrow({
      programId,
      discountId,
    });

    if (partnerIds) {
      const programEnrollments = await prisma.programEnrollment.findMany({
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

    const isDefault = program.defaultDiscountId === discountId;

    if (isDefault && partnerIds && partnerIds.length > 0) {
      throw new Error("Default discount cannot be updated with partners.");
    }

    await prisma.discount.update({
      where: {
        id: discountId,
      },
      data: {
        amount,
        type,
        maxDuration,
        couponId,
        couponTestId,
      },
    });

    if (partnerIds && partnerIds.length > 0) {
      await prisma.$transaction([
        // assign discountId to partners in partnerIds
        prisma.programEnrollment.updateMany({
          where: {
            programId,
            partnerId: {
              in: partnerIds,
            },
          },
          data: {
            discountId,
          },
        }),
        // remove discountId from partners not in partnerIds
        prisma.programEnrollment.updateMany({
          where: {
            programId,
            partnerId: {
              notIn: partnerIds,
            },
            discountId,
          },
          data: {
            discountId: null,
          },
        }),
      ]);
    }
  });
