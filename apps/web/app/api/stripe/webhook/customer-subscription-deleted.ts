import { deleteLink } from "@/lib/api/links";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { FREE_PLAN, log } from "@dub/utils";
import { sendEmail } from "emails";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function customerSubscriptionDeleted(event: Stripe.Event) {
  const subscriptionDeleted = event.data.object as Stripe.Subscription;

  const stripeId = subscriptionDeleted.customer.toString();

  // If a workspace deletes their subscription, reset their usage limit in the database to 1000.
  // Also remove the root domain redirect for all their domains from Redis.
  const workspace = await prisma.project.findUnique({
    where: {
      stripeId,
    },
    select: {
      id: true,
      slug: true,
      domains: true,
      users: {
        select: {
          user: {
            select: {
              email: true,
            },
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

  const workspaceUsers = workspace.users.map(
    ({ user }) => user.email as string,
  );

  const pipeline = redis.pipeline();
  // remove root domain redirect for all domains
  workspace.domains.forEach((domain) => {
    pipeline.hset(domain.slug.toLowerCase(), {
      _root: {
        id: domain.id,
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
      },
    }),
    pipeline.exec(),
    log({
      message:
        ":cry: Workspace *`" + workspace.slug + "`* deleted their subscription",
      type: "cron",
      mention: true,
    }),
    workspaceUsers.map((email) =>
      sendEmail({
        email,
        from: "steven@dub.co",
        subject: "Feedback on your Dub.co experience?",
        text: "Hey!\n\nI noticed you recently cancelled your Dub.co subscription – we're sorry to see you go!\n\nI'd love to hear your feedback on your experience with Dub – what could we have done better?\n\nThanks!\n\nSteven Tey\nFounder, Dub.co",
      }),
    ),
    workspace.domains.forEach((domain) => deleteLink(domain.id)),
  ]);
}
