import { qstash } from "@/lib/cron";
import { deleteStripeCoupon } from "@/lib/stripe/delete-coupon";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Discount, Project, User } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { recordAuditLog } from "../audit-logs/record-audit-log";

export async function deleteDiscount({
  workspace,
  discount,
  user,
}: {
  workspace: Pick<Project, "id" | "stripeConnectId" | "defaultProgramId">;
  discount: Omit<
    Discount,
    "createdAt" | "updatedAt" | "description" | "programId"
  >;
  user?: Pick<User, "id" | "email">; // the user who deleted the discount
}) {
  const programId = workspace.defaultProgramId!;

  if (!discount.default) {
    let offset = 0;

    while (true) {
      const partners = await prisma.programEnrollment.findMany({
        where: {
          programId,
          discountId: discount.id,
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
        `discount-partners:${discount.id}`,
        partners.map((partner) => partner.partnerId),
      );

      offset += 1000;
    }
  }

  const deletedDiscountId = await prisma.$transaction(async (tx) => {
    // 1. Find the default discount (if it exists)
    const defaultDiscount = await tx.discount.findFirst({
      where: {
        programId,
        default: true,
      },
    });

    // 2. Update current associations
    await tx.programEnrollment.updateMany({
      where: {
        programId,
        discountId: discount.id,
      },
      data: {
        // Replace the current discount with the default discount if it exists
        // and the discount we're deleting is not the default discount
        discountId: discount.default
          ? null
          : defaultDiscount
            ? defaultDiscount.id
            : null,
      },
    });

    // 3. Finally, delete the current discount
    await tx.discount.delete({
      where: {
        id: discount.id,
      },
    });

    return discount.id;
  });

  if (deletedDiscountId) {
    waitUntil(
      Promise.allSettled([
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
          body: {
            programId,
            discountId: discount.id,
            isDefault: discount.default,
            action: "discount-deleted",
          },
        }),

        user &&
          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "discount.deleted",
            description: `Discount ${discount.id} deleted`,
            actor: user,
            targets: [
              {
                type: "discount",
                id: discount.id,
                metadata: discount,
              },
            ],
          }),

        discount.couponId &&
          deleteStripeCoupon({
            couponId: discount.couponId,
            stripeConnectId: workspace.stripeConnectId,
          }),
      ]),
    );
  }

  return deletedDiscountId;
}
