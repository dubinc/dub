import { deleteWorkspaceFolders } from "@/lib/api/folders/delete-workspace-folders";
import { linkCache } from "@/lib/api/links/cache";
import { includeTags } from "@/lib/api/links/include-tags";
import { tokenCache } from "@/lib/auth/token-cache";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { recordLink } from "@/lib/tinybird";
import { capitalize, FREE_PLAN, log } from "@dub/utils";
import Stripe from "stripe";
import {
  CANCELLATION_FEEDBACK_EMAIL_TYPE,
  sendCancellationFeedback,
} from "./utils/send-cancellation-feedback";
import { updateWorkspacePlan } from "./utils/update-workspace-plan";

export async function customerSubscriptionDeleted(
  event: Stripe.CustomerSubscriptionDeletedEvent,
) {
  const deletedSubscription = event.data.object;

  const stripeId = deletedSubscription.customer.toString();

  // If a workspace deletes their subscription, reset their usage limit in the database to 1000.
  // Also remove the root domain link for all their domains from MySQL, Redis, and Tinybird
  const workspace = await prisma.project.findUnique({
    where: {
      stripeId,
    },
    include: {
      links: {
        where: {
          key: "_root",
        },
        include: includeTags,
      },
      users: {
        select: {
          user: {
            select: {
              name: true,
              email: true,
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
    return `Workspace with Stripe ID ${stripeId} not found in customer.subscription.deleted callback.`;
  }

  // Check if the customer has another subscription still in force (active or trialing)
  const [{ data: activeSubscriptions }, { data: trialingSubscriptions }] =
    await Promise.all([
      stripe.subscriptions.list({
        customer: stripeId,
        status: "active",
      }),
      stripe.subscriptions.list({
        customer: stripeId,
        status: "trialing",
      }),
    ]);

  const fallbackSubscription =
    activeSubscriptions[0] ?? trialingSubscriptions[0];

  if (fallbackSubscription) {
    const priceId = fallbackSubscription.items.data[0].price.id;

    await updateWorkspacePlan({
      workspace,
      priceId,
      subscription: fallbackSubscription,
    });

    return `Workspace ${workspace.slug} has another subscription; updated plan.`;
  }

  const workspaceLinks = workspace.links;
  const workspaceUsers = workspace.users.map(({ user }) => user);

  await prisma.project.update({
    where: {
      stripeId,
    },
    data: {
      plan: "free",
      trialEndsAt: null,
      planPeriod: null,
      billingCycleEndsAt: null,
      subscriptionCanceledAt: workspace.subscriptionCanceledAt
        ? undefined // skip updating subscriptionCanceledAt if it's already set
        : new Date(),
      usageLimit: FREE_PLAN.limits.clicks!,
      linksLimit: FREE_PLAN.limits.links!,
      domainsLimit: FREE_PLAN.limits.domains!,
      aiLimit: FREE_PLAN.limits.ai!,
      tagsLimit: FREE_PLAN.limits.tags!,
      foldersLimit: FREE_PLAN.limits.folders!,
      usersLimit: FREE_PLAN.limits.users!,
      paymentFailedAt: null,
    },
  });

  await Promise.allSettled([
    // remove logo from all domains for the workspace
    prisma.domain.updateMany({
      where: {
        projectId: workspace.id,
      },
      data: {
        logo: null,
      },
    }),

    // remove root domain link for all domains from MySQL
    prisma.link.updateMany({
      where: {
        id: {
          in: workspaceLinks.map(({ id }) => id),
        },
      },
      data: {
        url: "",
      },
    }),

    // expire root domain link cache from Redis
    linkCache.expireMany(workspaceLinks),

    // record root domain link for all domains from Tinybird
    recordLink(
      workspaceLinks.map((link) => ({
        ...link,
        url: "",
      })),
    ),
    // Log the deletion (only for non trial subscriptions)
    !workspace.trialEndsAt &&
      log({
        message:
          ":cry: Workspace *`" +
          workspace.slug +
          "`* deleted their *`" +
          capitalize(workspace.plan) +
          "`* subscription",
        type: "cron",
        mention: true,
      }),

    sendCancellationFeedback({
      workspace,
      owners: workspaceUsers,
    }),

    // Disable the webhooks
    prisma.webhook.updateMany({
      where: {
        projectId: workspace.id,
      },
      data: {
        disabledAt: new Date(),
      },
    }),

    prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        webhookEnabled: false,
      },
    }),

    // expire tokens cache
    tokenCache.expireMany({
      hashedKeys: workspace.restrictedTokens.map(({ hashedKey }) => hashedKey),
    }),

    // Open/uncollectible invoices remain payable after cancellation
    // Voiding is the only terminal status that prevents payment for a canceled subscription
    voidLatestInvoiceIfPayable(deletedSubscription),
  ]);

  // Reset cancellation feedback dedupe so a future resubscribe + cancel can send again
  await prisma.sentEmail.deleteMany({
    where: {
      projectId: workspace.id,
      type: CANCELLATION_FEEDBACK_EMAIL_TYPE,
    },
  });

  await deleteWorkspaceFolders({
    workspaceId: workspace.id,
  });

  return `Workspace ${workspace.slug} subscription deleted; downgraded to free.`;
}

async function voidLatestInvoiceIfPayable(subscription: Stripe.Subscription) {
  const latestInvoiceId =
    typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id;

  if (!latestInvoiceId) {
    return;
  }

  try {
    const invoice = await stripe.invoices.retrieve(latestInvoiceId);

    if (invoice.status !== "open" && invoice.status !== "uncollectible") {
      return;
    }

    await stripe.invoices.voidInvoice(latestInvoiceId);

    console.log(
      `Voided invoice ${latestInvoiceId} for canceled subscription ${subscription.id}.`,
    );
  } catch (error) {
    console.log(
      `Failed to void invoice ${latestInvoiceId} for subscription ${subscription.id}:`,
      error,
    );
  }
}
