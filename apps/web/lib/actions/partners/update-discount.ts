"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { updateDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, deepEqual } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const updateDiscountAction = authActionClient
  .schema(updateDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { discountId, amount, type, maxDuration, couponId, couponTestId } =
      parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discount = await getDiscountOrThrow({
      programId,
      discountId,
    });

    const { partnerGroup, ...updatedDiscount } = await prisma.discount.update({
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
      include: {
        partnerGroup: true,
      },
    });

    waitUntil(
      (async () => {
        const shouldExpireCache = !deepEqual(
          {
            amount: discount.amount,
            type: discount.type,
            maxDuration: discount.maxDuration,
          },
          {
            amount: updatedDiscount.amount,
            type: updatedDiscount.type,
            maxDuration: updatedDiscount.maxDuration,
          },
        );

        await Promise.allSettled([
          shouldExpireCache
            ? qstash.publishJSON({
                url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
                body: {
                  groupId: partnerGroup?.id,
                },
              })
            : Promise.resolve(),

          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "discount.updated",
            description: `Discount ${discount.id} updated`,
            actor: user,
            targets: [
              {
                type: "discount",
                id: discount.id,
                metadata: updatedDiscount,
              },
            ],
          }),
        ]);
      })(),
    );
  });
