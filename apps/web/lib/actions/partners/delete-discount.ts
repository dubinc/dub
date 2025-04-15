"use server";

import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
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
    const { workspace } = ctx;
    const { programId, discountId } = parsedInput;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    await getDiscountOrThrow({
      programId,
      discountId,
    });

    // Backup the partners data before deleting the discount
    // We'll use this data to update the link cache for the partner links
    const isDefault = program.defaultDiscountId === discountId;

    if (!isDefault) {
      let offset = 0;

      while (true) {
        const partners = await prisma.programEnrollment.findMany({
          where: {
            programId,
            discountId,
          },
          select: {
            partnerId: true,
          },
          skip: offset,
          take: 1000,
        });

        if (partners.length === 0) {
          break;
        }

        await redis.lpush(
          `discount-partners:${discountId}`,
          partners.map((partner) => partner.partnerId),
        );

        offset += 1000;
      }
    }

    const deletedDiscountId = await prisma.$transaction(async (tx) => {
      // if this is the default discount, set the program default discount to null
      if (isDefault) {
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

      return discountId;
    });

    if (deletedDiscountId) {
      waitUntil(
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
          body: {
            programId,
            discountId,
            isDefault,
            action: "discount-deleted",
          },
        }),
      );
    }
  });
