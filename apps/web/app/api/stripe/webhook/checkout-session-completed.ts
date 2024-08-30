import { limiter } from "@/lib/cron/limiter";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getPlanFromPriceId, log } from "@dub/utils";
import { sendEmail } from "emails";
import UpgradeEmail from "emails/upgrade-email";
import Stripe from "stripe";

export async function checkoutSessionCompleted(event: Stripe.Event) {
  const checkoutSession = event.data.object as Stripe.Checkout.Session;

  if (
    checkoutSession.client_reference_id === null ||
    checkoutSession.customer === null
  ) {
    await log({
      message: "Missing items in Stripe webhook callback",
      type: "errors",
    });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    checkoutSession.subscription as string,
  );
  const priceId = subscription.items.data[0].price.id;

  const plan = getPlanFromPriceId(priceId);

  if (!plan) {
    await log({
      message: `Invalid price ID in checkout.session.completed event: ${priceId}`,
      type: "errors",
    });
    return;
  }

  const stripeId = checkoutSession.customer.toString();
  const workspaceId = checkoutSession.client_reference_id;
  const planName = plan.name.toLowerCase();

  // when the workspace subscribes to a plan, set their stripe customer ID
  // in the database for easy identification in future webhook events
  // also update the billingCycleStart to today's date

  const workspace = await prisma.project.update({
    where: {
      id: workspaceId,
    },
    data: {
      stripeId,
      billingCycleStart: new Date().getDate(),
      plan: planName,
      usageLimit: plan.limits.clicks!,
      linksLimit: plan.limits.links!,
      domainsLimit: plan.limits.domains!,
      aiLimit: plan.limits.ai!,
      tagsLimit: plan.limits.tags!,
      usersLimit: plan.limits.users!,
    },
    select: {
      users: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              onboardingStep: true,
            },
          },
        },
        where: {
          user: {
            isMachine: false,
          },
        },
      },
    },
  });

  await prisma.restrictedToken.updateMany({
    where: {
      projectId: workspaceId,
    },
    data: {
      rateLimit: plan.limits.api,
    },
  });

  const users = workspace.users.map(({ user }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    onboardingStep: user.onboardingStep,
  }));

  const usersInOnboarding = users.filter(({ onboardingStep }) =>
    Boolean(onboardingStep),
  );

  await Promise.allSettled([
    // Complete onboarding for workspace users
    prisma.user.updateMany({
      where: {
        id: {
          in: usersInOnboarding.map(({ id }) => id),
        },
      },
      data: {
        onboardingStep: null,
      },
    }),
    ...users.map((user) => {
      limiter.schedule(() =>
        sendEmail({
          email: user.email as string,
          subject: `Thank you for upgrading to Dub.co ${plan.name}!`,
          react: UpgradeEmail({
            name: user.name,
            email: user.email as string,
            plan: plan.name,
          }),
          marketing: true,
        }),
      );
    }),
  ]);
}
