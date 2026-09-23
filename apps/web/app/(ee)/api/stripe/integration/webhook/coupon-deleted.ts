import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { dispatchWorkflows } from "@/lib/jobs/publish-workflows";
import { prisma } from "@/lib/prisma";
import { sendBatchEmail } from "@dub/email";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import DiscountDeleted from "@dub/email/templates/discount-deleted";
import { pluck } from "@dub/utils";
import { DiscountProvider } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import { WebhookHandlerInput, WebhookHandlerResponse } from "./types";

// Handle event "coupon.deleted"
export async function couponDeleted({
  event,
  workspace,
}: Omit<
  WebhookHandlerInput<Stripe.CouponDeletedEvent>,
  "mode"
>): Promise<WebhookHandlerResponse> {
  const coupon = event.data.object;
  const stripeAccountId = event.account as string;
  const programId = workspace.defaultProgramId;

  if (!programId) {
    return {
      response: `Workspace ${workspace.id} for stripe account ${stripeAccountId} has no programs.`,
    };
  }

  const discounts = await prisma.discount.findMany({
    where: {
      programId,
      provider: DiscountProvider.stripe,
      OR: [{ couponId: coupon.id }, { couponTestId: coupon.id }],
    },
  });

  if (discounts.length === 0) {
    return {
      response: `Discount not found for Stripe coupon ${coupon.id}.`,
    };
  }

  const discountIds = pluck(discounts, "id");

  await prisma.$transaction(async (tx) => {
    await tx.partnerGroup.updateMany({
      where: {
        discountId: {
          in: discountIds,
        },
      },
      data: {
        discountId: null,
      },
    });

    // Soft delete the discounts
    await tx.discount.updateMany({
      where: {
        id: {
          in: discountIds,
        },
      },
      data: {
        programId: null,
      },
    });
  });

  await dispatchWorkflows(
    discountIds.map((discountId) => ({
      name: "detach-discount-workflow" as const,
      payload: {
        programId,
        discountId,
      },
      options: {
        label: discountId,
        deduplicationId: `detach-discount-${discountId}`,
      },
    })),
  );

  waitUntil(
    (async () => {
      const { users } = await getWorkspaceUsers({
        workspaceId: workspace.id,
        role: "owner",
      });

      await sendBatchEmail(
        users.map((user) => ({
          from: VARIANT_TO_FROM_MAP.notifications,
          to: user.email,
          subject: "Your discount has been deleted",
          react: DiscountDeleted({
            email: user.email,
            coupon: {
              id: coupon.id,
            },
          }),
        })),
      );
    })(),
  );

  return {
    response: `Stripe coupon ${coupon.id} deleted.`,
  };
}
