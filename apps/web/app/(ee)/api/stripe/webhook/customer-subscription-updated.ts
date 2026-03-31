import { prisma } from "@dub/prisma";
import { getPlanAndTierFromPriceId } from "@dub/utils";
import Stripe from "stripe";
import { sendCancellationFeedback } from "./utils/send-cancellation-feedback";
import { updateWorkspacePlan } from "./utils/update-workspace-plan";

export async function customerSubscriptionUpdated(event: Stripe.Event) {
  const subscriptionUpdated = event.data.object as Stripe.Subscription;
  const priceId = subscriptionUpdated.items.data[0].price.id;

  const { plan } = getPlanAndTierFromPriceId({ priceId });

  if (!plan) {
    return `Invalid price ID in customer.subscription.updated event: ${priceId}`;
  }

  const stripeId = subscriptionUpdated.customer.toString();

  const workspace = await prisma.project.findUnique({
    where: {
      stripeId,
    },
    select: {
      id: true,
      plan: true,
      planTier: true,
      paymentFailedAt: true,
      payoutsLimit: true,
      foldersUsage: true,
      defaultProgramId: true,
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
      restrictedTokens: {
        select: {
          hashedKey: true,
        },
      },
    },
  });

  if (!workspace) {
    return `Workspace with Stripe ID ${stripeId} not found in customer.subscription.updated callback.`;
  }

  await updateWorkspacePlan({
    workspace,
    priceId,
  });

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
    return `Updated workspace ${workspace.id} plan; cancellation at period end requested.`;
  }

  return `Updated workspace ${workspace.id} plan to ${plan.name}.`;
}
