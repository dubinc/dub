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
    const { programId, partnerIds, amount, maxDuration } = parsedInput;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    let isDefault = true;
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

      isDefault = false;
    }

    if (program.defaultDiscountId && isDefault) {
      throw new Error("A program can have only one default discount.");
    }

    const discount = await prisma.discount.create({
      data: {
        id: createId({ prefix: "dis_" }),
        programId,
        amount,
        maxDuration,
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
