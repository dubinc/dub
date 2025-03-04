"use server";

import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { createId } from "@/lib/api/utils";
import { createDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

export const createDiscountAction = authActionClient
  .schema(createDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const {
      workspaceId,
      programId,
      partnerIds,
      discountSource,
      ...discountData
    } = parsedInput;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    let isDefault = true;

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
          discountId: true,
        },
      });

      if (programEnrollments.length !== partnerIds.length) {
        throw new Error("Invalid partner IDs provided.");
      }

      const partnersWithDiscounts = programEnrollments.filter(
        (pe) => pe.discountId,
      );

      if (partnersWithDiscounts.length > 0) {
        throw new Error("Partners cannot belong to more than one discount.");
      }

      isDefault = false;
    }

    if (program.defaultDiscountId && isDefault) {
      throw new Error("A program can have only one default discount.");
    }

    const discount = await prisma.discount.create({
      data: {
        id: createId({ prefix: "dis_" }),
        programId,
        ...discountData,
      },
    });

    if (partnerIds) {
      await prisma.programEnrollment.updateMany({
        where: {
          programId,
          partnerId: {
            in: partnerIds,
          },
        },
        data: {
          discountId: discount.id,
        },
      });
    }

    if (isDefault) {
      await prisma.program.update({
        where: {
          id: programId,
        },
        data: {
          defaultDiscountId: discount.id,
        },
      });
    }
  });
