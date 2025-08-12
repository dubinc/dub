"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { createDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const createDiscountAction = authActionClient
  .schema(createDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { amount, type, maxDuration, couponId, couponTestId, groupId } =
      parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    await getGroupOrThrow({
      groupId,
      programId,
    });

    const discount = await prisma.$transaction(async (tx) => {
      const discount = await tx.discount.create({
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

      await tx.partnerGroup.update({
        where: {
          id: groupId,
        },
        data: {
          discountId: discount.id,
        },
      });

      await tx.programEnrollment.updateMany({
        where: {
          groupId,
        },
        data: {
          discountId: discount.id,
        },
      });

      return discount;
    });

    waitUntil(
      (async () => {
        await Promise.allSettled([
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
            body: {
              programId,
              discountId: discount.id,
              action: "discount-created",
            },
          }),

          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "discount.created",
            description: `Discount ${discount.id} created`,
            actor: user,
            targets: [
              {
                type: "discount",
                id: discount.id,
                metadata: discount,
              },
            ],
          }),
        ]);
      })(),
    );
  });
