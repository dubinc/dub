"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { qstash } from "@/lib/cron";
import { createDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const createDiscountAction = authActionClient
  .schema(createDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerIds, amount, type, maxDuration, couponId, couponTestId } =
      parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

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
        id: createId({ prefix: "disc_" }),
        programId,
        amount,
        type,
        maxDuration,
        couponId,
        couponTestId,
      },
    });

    if (partnerIds && partnerIds.length > 0) {
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

    waitUntil(
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
        body: {
          programId,
          discountId: discount.id,
          isDefault,
          action: "discount-created",
        },
      }),
    );
  });
