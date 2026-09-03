"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { revalidateProgramPublicPages } from "@/lib/api/programs/revalidate-program-public-pages";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { updateDiscountSchema } from "@/lib/zod/schemas/discount";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const updateDiscountAction = authActionClient
  .inputSchema(updateDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { discountId, couponTestId, autoProvision } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

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
        ...(autoProvision !== undefined && {
          autoProvisionEnabledAt: autoProvision
            ? discount.autoProvisionEnabledAt ?? new Date()
            : null,
        }),
      },
      include: {
        partnerGroup: true,
      },
    });

    const shouldExpireCache =
      discount.couponTestId !== updatedDiscount.couponTestId;

    if (shouldExpireCache) {
      revalidateProgramPublicPages(programId);
    }

    waitUntil(
      (async () => {
        await Promise.allSettled([
          ...(shouldExpireCache
            ? [
                qstash.publishJSON({
                  url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
                  body: {
                    groupId: partnerGroup?.id,
                  },
                }),
              ]
            : []),

          ...(updatedDiscount.autoProvisionEnabledAt
            ? [
                qstash.publishJSON({
                  url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/create/queue-batches`,
                  body: {
                    discountId: discount.id,
                  },
                }),
              ]
            : []),

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
