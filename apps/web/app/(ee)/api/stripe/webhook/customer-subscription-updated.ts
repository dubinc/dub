import { prisma } from "@/lib/prisma";
import { TRIAL_LIMITS } from "@dub/utils";
import { differenceInHours } from "date-fns";
import Stripe from "stripe";
import { sendCancellationFeedback } from "./utils/send-cancellation-feedback";
import { updateWorkspacePlan } from "./utils/update-workspace-plan";

export async function customerSubscriptionUpdated(
  event: Stripe.CustomerSubscriptionUpdatedEvent,
) {
  const updatedSubscription = event.data.object;
  const priceId = updatedSubscription.items.data[0].price.id;

  if (
    ![
      "active",
      "trialing",
      "past_due", // special case for handling past_due subscriptions (after a free trial)
    ].includes(updatedSubscription.status)
  ) {
    return `Invalid updated subscription status "${updatedSubscription.status}" for subscription ${updatedSubscription.id}, skipping...`;
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
    return `Workspace with Stripe ID ${stripeId} not found, skipping...`;
  }

  if (updatedSubscription.status === "past_due") {
    const trialEndsAt = updatedSubscription.trial_end
      ? new Date(updatedSubscription.trial_end * 1000)
      : null;

    // if the subscription became past_due and the workspace's trial ended less than 2 hours ago
    // it means that their payment failed and we need to revert to their trial limits
    if (trialEndsAt && differenceInHours(new Date(), trialEndsAt) < 2) {
      await prisma.project.update({
        where: {
          stripeId,
        },
        data: {
          trialEndsAt,
          // revert to trial limits
          usageLimit: TRIAL_LIMITS.clicks,
          linksLimit: TRIAL_LIMITS.links,
          payoutsLimit: TRIAL_LIMITS.payouts,
          domainsLimit: TRIAL_LIMITS.domains,
          aiLimit: TRIAL_LIMITS.ai,
          tagsLimit: TRIAL_LIMITS.tags,
          partnerTagsLimit: TRIAL_LIMITS.partnerTags,
          foldersLimit: TRIAL_LIMITS.folders,
          groupsLimit: TRIAL_LIMITS.groups,
          networkInvitesLimit: TRIAL_LIMITS.networkInvites,
          partnersLimit: TRIAL_LIMITS.partners,
          usersLimit: TRIAL_LIMITS.users,
        },
      });
      return `Reverted workspace ${workspace.slug} to trial limits due to past_due subscription.`;
    }
    return `Unrelated past_due subscription event for workspace ${workspace.slug}, skipping...`;
  }

  await updateWorkspacePlan({
    workspace,
    priceId,
    subscription: updatedSubscription,
  });

  if (updatedSubscription.cancel_at_period_end) {
    const owners = workspace.users.map(({ user }) => user);
    const cancelReason = updatedSubscription.cancellation_details?.feedback;

    await sendCancellationFeedback({
      workspace,
      owners,
      reason: cancelReason,
    });
    return `Sent cancellation feedback to ${owners.length} workspace owners for workspace ${workspace.slug}.`;
  }

  return `Processed customer.subscription.updated event for workspace ${workspace.id}.`;
}
