import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { FREE_PLAN, log } from "@dub/utils";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sendCancellationFeedback } from "./utils";

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
      domains: true,
      links: {
        where: {
          key: "_root",
        },
        include: {
          tags: true,
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
    },
  });

  if (!workspace) {
    await log({
      message:
        "Workspace with Stripe ID *`" +
        stripeId +
        "`* not found in Stripe webhook `customer.subscription.deleted` callback",
      type: "errors",
    });
    return NextResponse.json({ received: true });
  }

  const workspaceLinks = workspace.links;

  const workspaceUsers = workspace.users.map(({ user }) => user);

  const pipeline = redis.pipeline();
  // remove root domain redirect for all domains from Redis
  workspaceLinks.forEach(({ id, domain }) => {
    pipeline.hset(domain.toLowerCase(), {
      _root: {
        id,
        projectId: workspace.id,
      },
    });
  });

  await Promise.allSettled([
    prisma.project.update({
      where: {
        stripeId,
      },
      data: {
        plan: "free",
        usageLimit: FREE_PLAN.limits.clicks!,
        linksLimit: FREE_PLAN.limits.links!,
        domainsLimit: FREE_PLAN.limits.domains!,
        aiLimit: FREE_PLAN.limits.ai!,
        tagsLimit: FREE_PLAN.limits.tags!,
        usersLimit: FREE_PLAN.limits.users!,
        paymentFailedAt: null,
      },
    }),

    // update rate limit for all restricted tokens for the workspace
    prisma.restrictedToken.updateMany({
      where: {
        projectId: workspace.id,
      },
      data: {
        rateLimit: FREE_PLAN.limits.api,
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

    pipeline.exec(),

    // record root domain link for all domains from Tinybird
    recordLink(
      workspaceLinks.map((link) => ({
        link_id: link.id,
        domain: link.domain,
        key: link.key,
        url: link.url,
        tag_ids: link.tags.map((tag) => tag.tagId),
        workspace_id: link.projectId,
        created_at: link.createdAt,
      })),
    ),
    log({
      message:
        ":cry: Workspace *`" + workspace.slug + "`* deleted their subscription",
      type: "cron",
      mention: true,
    }),
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
  ]);
}
