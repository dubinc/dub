"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { queueDiscountCodeDeletion } from "@/lib/api/discounts/queue-discount-code-deletion";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const deleteDiscountSchema = z.object({
  workspaceId: z.string(),
  discountId: z.string(),
});

export const deleteDiscountAction = authActionClient
  .schema(deleteDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { discountId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discount = await getDiscountOrThrow({
      programId,
      discountId,
    });

    // Cache discount codes to delete them later
    const discountCodes = await prisma.discountCode.findMany({
      where: {
        discountId: discount.id,
      },
    });

    const group = await prisma.$transaction(async (tx) => {
      const group = await tx.partnerGroup.update({
        where: {
          discountId: discount.id,
        },
        data: {
          discountId: null,
        },
      });

      await tx.programEnrollment.updateMany({
        where: {
          discountId: discount.id,
        },
        data: {
          discountId: null,
        },
      });

      await tx.discountCode.updateMany({
        where: {
          discountId: discount.id,
        },
        data: {
          discountId: null,
        },
      });

      await tx.discount.delete({
        where: {
          id: discount.id,
        },
      });

      return group;
    });

    waitUntil(
      Promise.allSettled([
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
          body: {
            groupId: group.id,
          },
        }),

        ...discountCodes.map((discountCode) =>
          queueDiscountCodeDeletion(discountCode.id),
        ),

        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "discount.deleted",
          description: `Discount ${discountId} deleted`,
          actor: user,
          targets: [
            {
              type: "discount",
              id: discountId,
              metadata: discount,
            },
          ],
        }),
      ]),
    );
  });
