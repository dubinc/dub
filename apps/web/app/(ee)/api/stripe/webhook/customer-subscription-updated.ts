import { prisma } from "@dub/prisma";
import { getPlanAndTierFromPriceId } from "@dub/utils";
import Stripe from "stripe";
import { sendCancellationFeedback } from "./utils/send-cancellation-feedback";
import { updateWorkspacePlan } from "./utils/update-workspace-plan";

export async function customerSubscriptionUpdated(
  event: Stripe.CustomerSubscriptionUpdatedEvent,
) {
  const updatedSubscription = event.data.object;
  const priceId = updatedSubscription.items.data[0].price.id;

  const { plan } = getPlanAndTierFromPriceId({ priceId });

  if (!plan) {
    return `Invalid price ID in customer.subscription.updated event: ${priceId}`;
  }

  const stripeId = updatedSubscription.customer.toString();

  const workspace = await prisma.project.findUnique({
    where: {
      stripeId,
    },
    include: {
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
    subscription: updatedSubscription,
  });

  const subscriptionCanceled =
    updatedSubscription.status === "active" &&
    updatedSubscription.cancel_at_period_end;

  if (subscriptionCanceled) {
    const owners = workspace.users.map(({ user }) => user);
    const cancelReason = updatedSubscription.cancellation_details?.feedback;

    await sendCancellationFeedback({
      owners,
      reason: cancelReason,
    });
    return `Sent cancellation feedback to ${owners.length} workspace owners for workspace ${workspace.slug}.`;
  }

  return `Processed customer.subscription.updated event for workspace ${workspace.id}.`;
}
