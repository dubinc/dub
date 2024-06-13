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

  // when the workspace subscribes to a plan, set their stripe customer ID
  // in the database for easy identification in future webhook events
  // also update the billingCycleStart to today's date

  const workspace = await prisma.project.update({
    where: {
      id: checkoutSession.client_reference_id,
    },
    data: {
      stripeId,
      billingCycleStart: new Date().getDate(),
      plan: plan.name.toLowerCase(),
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
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const users = workspace.users.map(({ user }) => ({
    name: user.name,
    email: user.email,
  }));

  await Promise.allSettled(
    users.map((user) => {
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
  );
}
