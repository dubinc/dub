import { prisma } from "@/lib/prisma";
import { getPlanFromPriceId, log } from "@dub/utils";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sendCancellationFeedback } from "./utils";

export async function customerSubscriptionUpdated(event: Stripe.Event) {
  const subscriptionUpdated = event.data.object as Stripe.Subscription;
  const priceId = subscriptionUpdated.items.data[0].price.id;

  const plan = getPlanFromPriceId(priceId);

  if (!plan) {
    await log({
      message: `Invalid price ID in customer.subscription.updated event: ${priceId}`,
      type: "errors",
    });
    return;
  }

  const stripeId = subscriptionUpdated.customer.toString();

  const workspace = await prisma.project.findUnique({
    where: {
      stripeId,
    },
    select: {
      id: true,
      plan: true,
      paymentFailedAt: true,
      users: {
        select: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        where: {
          role: "owner",
          user: {
            isMachine: false,
          },
        },
      },
    },
  });

  if (!workspace) {
    await log({
      message:
        "Workspace with Stripe ID *`" +
        stripeId +
        "`* not found in Stripe webhook `customer.subscription.updated` callback",
      type: "errors",
    });
    return NextResponse.json({ received: true });
  }

  const newPlan = plan.name.toLowerCase();

  // If a workspace upgrades/downgrades their subscription, update their usage limit in the database.
  if (workspace.plan !== newPlan) {
    await Promise.allSettled([
      prisma.project.update({
        where: {
          stripeId,
        },
        data: {
          plan: newPlan,
          usageLimit: plan.limits.clicks!,
          linksLimit: plan.limits.links!,
          domainsLimit: plan.limits.domains!,
          aiLimit: plan.limits.ai!,
          tagsLimit: plan.limits.tags!,
          foldersLimit: plan.limits.folders!,
          usersLimit: plan.limits.users!,
          paymentFailedAt: null,
        },
      }),
      prisma.restrictedToken.updateMany({
        where: {
          projectId: workspace.id,
        },
        data: {
          rateLimit: plan.limits.api,
        },
      }),
    ]);
  } else if (workspace.paymentFailedAt) {
    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        paymentFailedAt: null,
      },
    });
  }

  const subscriptionCanceled =
    subscriptionUpdated.status === "active" &&
    subscriptionUpdated.cancel_at_period_end;

  if (subscriptionCanceled) {
    const owners = workspace.users.map(({ user }) => user);
    const cancelReason = subscriptionUpdated.cancellation_details?.feedback;

    await sendCancellationFeedback({
      owners,
      reason: cancelReason,
    });
  }
}
