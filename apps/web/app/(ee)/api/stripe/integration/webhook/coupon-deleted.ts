import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { qstash } from "@/lib/cron";
import { sendBatchEmail } from "@dub/email";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import DiscountDeleted from "@dub/email/templates/discount-deleted";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";

// Handle event "coupon.deleted"
export async function couponDeleted(event: Stripe.Event) {
  const coupon = event.data.object as Stripe.Coupon;
  const stripeAccountId = event.account as string;

  const workspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
      slug: true,
      defaultProgramId: true,
      stripeConnectId: true,
    },
  });

  if (!workspace) {
    return `Workspace not found for Stripe account ${stripeAccountId}.`;
  }

  if (!workspace.defaultProgramId) {
    return `Workspace ${workspace.id} for stripe account ${stripeAccountId} has no programs.`;
  }

  const discounts = await prisma.discount.findMany({
    where: {
      programId: workspace.defaultProgramId,
      OR: [{ couponId: coupon.id }, { couponTestId: coupon.id }],
    },
    include: {
      partnerGroup: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!discounts.length) {
    return `Discount not found for Stripe coupon ${coupon.id}.`;
  }

  const discountIds = discounts.map((d) => d.id);
  const groupIds = discounts
    .map((d) => d.partnerGroup?.id)
    .filter(Boolean) as string[];

  await prisma.$transaction(async (tx) => {
    if (groupIds.length > 0) {
      await tx.partnerGroup.updateMany({
        where: {
          id: {
            in: groupIds,
          },
        },
        data: {
          discountId: null,
        },
      });
    }

    if (discountIds.length > 0) {
      await tx.programEnrollment.updateMany({
        where: {
          discountId: {
            in: discountIds,
          },
        },
        data: {
          discountId: null,
        },
      });

      await tx.discountCode.deleteMany({
        where: {
          discountId: {
            in: discountIds,
          },
        },
      });

      await tx.discount.deleteMany({
        where: {
          id: {
            in: discountIds,
          },
        },
      });
    }
  });

  waitUntil(
    (async () => {
      const { users } = await getWorkspaceUsers({
        workspaceId: workspace.id,
        role: "owner",
      });

      await Promise.allSettled([
        ...groupIds.map((groupId) =>
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
            body: {
              groupId,
            },
          }),
        ),

        sendBatchEmail(
          users.map((user) => ({
            from: VARIANT_TO_FROM_MAP.notifications,
            to: user.email,
            subject: `${process.env.NEXT_PUBLIC_APP_NAME}: Discount has been deleted`,
            react: DiscountDeleted({
              email: user.email,
              coupon: {
                id: coupon.id,
              },
            }),
          })),
        ),
      ]);
    })(),
  );

  return `Stripe coupon ${coupon.id} deleted.`;
}
