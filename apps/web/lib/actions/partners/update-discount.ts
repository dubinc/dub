"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { updateDiscountSchema } from "@/lib/zod/schemas/discount";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, deepEqual } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { revalidatePath } from "next/cache";
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

    const { program, partnerGroup, ...updatedDiscount } =
      await prisma.discount.update({
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
          program: true,
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
          // shouldExpireCache
          //   ? qstash.publishJSON({
          //       url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
          //       body: {
          //         groupId: partnerGroup?.id,
          //       },
          //     })
          //   : Promise.resolve(),

          ...(shouldExpireCache
            ? [
                qstash.publishJSON({
                  url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
                  body: {
                    groupId: partnerGroup?.id,
                  },
                }),

                // we only cache default group pages for now so we need to invalidate them
                ...(partnerGroup?.slug === DEFAULT_PARTNER_GROUP.slug
                  ? [
                      revalidatePath(`/partners.dub.co/${program.slug}`),
                      revalidatePath(`/partners.dub.co/${program.slug}/apply`),
                    ]
                  : []),
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
