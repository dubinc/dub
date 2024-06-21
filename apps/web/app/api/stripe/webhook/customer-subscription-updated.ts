import { getAPIRateLimitForPlan } from "@/lib/api/tokens/ratelimit";
import { prisma } from "@/lib/prisma";
import { PlanProps } from "@/lib/types";
import { getPlanFromPriceId, log } from "@dub/utils";
import { NextResponse } from "next/server";
import Stripe from "stripe";

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
    await prisma.project.update({
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
        usersLimit: plan.limits.users!,
      },
    });

    prisma.restrictedToken.updateMany({
      where: {
        projectId: workspace.id,
      },
      data: {
        rateLimit: getAPIRateLimitForPlan(newPlan as PlanProps),
      },
    });
  }
}
