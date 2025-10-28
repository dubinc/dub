import { deleteWorkspaceFolders } from "@/lib/api/folders/delete-workspace-folders";
import { linkCache } from "@/lib/api/links/cache";
import { tokenCache } from "@/lib/auth/token-cache";
import { isBlacklistedEmail } from "@/lib/edge-config/is-blacklisted-email";
import { stripe } from "@/lib/stripe";
import { recordLink } from "@/lib/tinybird";
import { webhookCache } from "@/lib/webhook/cache";
import { prisma } from "@dub/prisma";
import { capitalize, FREE_PLAN, getPlanFromPriceId, log } from "@dub/utils";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sendCancellationFeedback } from "./utils/send-cancellation-feedback";
import { updateWorkspacePlan } from "./utils/update-workspace-plan";

export async function customerSubscriptionDeleted(event: Stripe.Event) {
  const subscriptionDeleted = event.data.object as Stripe.Subscription;

  const stripeId = subscriptionDeleted.customer.toString();

  // If a workspace deletes their subscription, reset their usage limit in the database to 1000.
  // Also remove the root domain link for all their domains from MySQL, Redis, and Tinybird
  const workspace = await prisma.project.findUnique({
    where: {
      stripeId,
    },
    select: {
      id: true,
      slug: true,
      plan: true,
      foldersUsage: true,
      paymentFailedAt: true,
      payoutsLimit: true,
      defaultProgramId: true,
      links: {
        where: {
          key: "_root",
        },
        include: {
          tags: {
            select: {
              tag: true,
            },
          },
        },
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
    console.log(
      "Workspace with Stripe ID *`" +
        stripeId +
        "`* not found in Stripe webhook `customer.subscription.deleted` callback",
    );
    return NextResponse.json({ received: true });
  }

  // Check if the customer has another active subscription
  const { data: activeSubscriptions } = await stripe.subscriptions.list({
    customer: stripeId,
    status: "active",
  });

  if (activeSubscriptions.length > 0) {
    const activeSubscription = activeSubscriptions[0];
    const priceId = activeSubscription.items.data[0].price.id;
    const plan = getPlanFromPriceId(priceId);

    await updateWorkspacePlan({
      workspace,
      plan,
      priceId,
    });

    return NextResponse.json({ received: true });
  }

  const workspaceLinks = workspace.links;
  const workspaceUsers = workspace.users.map(({ user }) => user);

  const isBlacklistedCancellation = await isBlacklistedEmail(
    workspaceUsers.filter(({ email }) => email).map(({ email }) => email!),
  );

  await Promise.allSettled([
    prisma.project.update({
      where: {
        stripeId,
      },
      data: {
        plan: "free",
        usageLimit: FREE_PLAN.limits.clicks!,
        linksLimit: FREE_PLAN.limits.links!,
        payoutsLimit: FREE_PLAN.limits.payouts!,
        domainsLimit: FREE_PLAN.limits.domains!,
        aiLimit: FREE_PLAN.limits.ai!,
        tagsLimit: FREE_PLAN.limits.tags!,
        foldersLimit: FREE_PLAN.limits.folders!,
        groupsLimit: FREE_PLAN.limits.groups!,
        networkInvitesLimit: FREE_PLAN.limits.networkInvites!,
        usersLimit: FREE_PLAN.limits.users!,
        paymentFailedAt: null,
        foldersUsage: 0,
      },
    }),

    // disable dub.link premium default domain for the workspace
    prisma.defaultDomains.update({
      where: {
        projectId: workspace.id,
      },
      data: {
        dublink: false,
      },
    }),

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
    // Log the deletion
    log({
      message:
        ":cry: Workspace *`" +
        workspace.slug +
        "`* deleted their *`" +
        capitalize(workspace.plan) +
        "`* subscription" +
        (isBlacklistedCancellation ? " (blacklisted / banned)" : ""),
      type: "cron",
      mention: true,
    }),

    // Don't send feedback if the user was blacklisted / banned
    !isBlacklistedCancellation &&
      sendCancellationFeedback({
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

  if (workspace.foldersUsage > 0) {
    await deleteWorkspaceFolders({
      workspaceId: workspace.id,
    });
  }
}
