"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { updateDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const updateDiscountAction = authActionClient
  .schema(updateDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { discountId, couponTestId } = parsedInput;

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
        couponTestId: couponTestId || null,
      },
      include: {
        partnerGroup: {
          select: {
            id: true,
          },
        },
      },
    });

    const shouldExpireCache =
      discount.couponTestId !== updatedDiscount.couponTestId;

    waitUntil(
      Promise.allSettled([
        shouldExpireCache &&
          partnerGroup &&
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
            body: {
              groupId: partnerGroup.id,
            },
          }),

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
      ]),
    );
  });
