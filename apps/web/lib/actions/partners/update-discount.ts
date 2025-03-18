"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { updateDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const updateDiscountAction = authActionClient
  .schema(updateDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
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

    const discount = await prisma.discount.update({
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

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId: program.id,
        event: "discount.update",
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
