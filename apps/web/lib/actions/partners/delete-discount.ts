"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { queueDiscountProcessing } from "@/lib/api/discounts/queue-discount-processing";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const deleteDiscountSchema = z.object({
  workspaceId: z.string(),
  discountId: z.string(),
});

export const deleteDiscountAction = authActionClient
  .inputSchema(deleteDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { discountId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discount = await getDiscountOrThrow({
      programId,
      discountId,
    });

    const partnerGroup = await prisma.$transaction(async (tx) => {
      const partnerGroup = await tx.partnerGroup.update({
        where: {
          discountId: discount.id,
        },
        data: {
          discountId: null,
        },
        select: {
          id: true,
        },
      });

      // Soft delete discount, we will hard delete it in the cron job
      await tx.discount.update({
        where: {
          id: discount.id,
        },
        data: {
          programId: null,
        },
      });

      return partnerGroup;
    });

    await queueDiscountProcessing({
      event: "discount-deleted",
      groupId: partnerGroup.id,
      discountSnapshot: {
        id: discount.id,
      },
    });

    waitUntil(
      Promise.allSettled([
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
          body: {
            groupId: partnerGroup.id,
          },
        }),

        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/delete/queue`,
          method: "POST",
          body: {
            discountId: discount.id,
            provider: discount.provider,
          },
        }),

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
