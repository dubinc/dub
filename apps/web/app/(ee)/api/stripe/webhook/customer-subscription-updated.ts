import { deleteWorkspaceFolders } from "@/lib/api/folders/delete-workspace-folders";
import { tokenCache } from "@/lib/auth/token-cache";
import { webhookCache } from "@/lib/webhook/cache";
import { prisma } from "@dub/prisma";
import { getPlanFromPriceId } from "@dub/utils";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sendCancellationFeedback } from "./utils";

export async function customerSubscriptionUpdated(event: Stripe.Event) {
  const subscriptionUpdated = event.data.object as Stripe.Subscription;
  const priceId = subscriptionUpdated.items.data[0].price.id;

  const plan = getPlanFromPriceId(priceId);

  if (!plan) {
    console.log(
      `Invalid price ID in customer.subscription.updated event: ${priceId}`,
    );
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
      payoutsLimit: true,
      foldersUsage: true,
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
    console.log(
      "Workspace with Stripe ID *`" +
        stripeId +
        "`* not found in Stripe webhook `customer.subscription.updated` callback",
    );
    return NextResponse.json({ received: true });
  }

  const newPlanName = plan.name.toLowerCase();
  const shouldDisableWebhooks = newPlanName === "free" || newPlanName === "pro";
  const shouldDeleteFolders =
    newPlanName === "free" && workspace.foldersUsage > 0;

  // If a workspace upgrades/downgrades their subscription, update their usage limit in the database.
  if (
    workspace.plan !== newPlanName ||
    workspace.payoutsLimit !== plan.limits.payouts
  ) {
    await Promise.allSettled([
      prisma.project.update({
        where: {
          stripeId,
        },
        data: {
          plan: newPlanName,
          usageLimit: plan.limits.clicks!,
          linksLimit: plan.limits.links!,
          payoutsLimit: plan.limits.payouts!,
          domainsLimit: plan.limits.domains!,
          aiLimit: plan.limits.ai!,
          tagsLimit: plan.limits.tags!,
          foldersLimit: plan.limits.folders!,
          usersLimit: plan.limits.users!,
          paymentFailedAt: null,
          ...(shouldDeleteFolders && { foldersUsage: 0 }),
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

      // expire tokens cache
      tokenCache.expireMany({
        hashedKeys: workspace.restrictedTokens.map(
          ({ hashedKey }) => hashedKey,
        ),
      }),
    ]);

    // Disable the webhooks if the new plan does not support webhooks
    if (shouldDisableWebhooks) {
      await Promise.all([
        prisma.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            webhookEnabled: false,
          },
        }),

        prisma.webhook.updateMany({
          where: {
            projectId: workspace.id,
          },
          data: {
            disabledAt: new Date(),
          },
        }),
      ]);

      // Update the webhooks cache
      const webhooks = await prisma.webhook.findMany({
        where: {
          projectId: workspace.id,
        },
        select: {
          id: true,
          url: true,
          secret: true,
          triggers: true,
          disabledAt: true,
        },
      });

      await webhookCache.mset(webhooks);
    }

    // Delete the folders if the new plan is free
    // For downgrade from Business → Pro, it should be fine since we're accounting that to make sure all folders get write access.
    if (shouldDeleteFolders) {
      await deleteWorkspaceFolders({
        workspaceId: workspace.id,
      });
    }
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
