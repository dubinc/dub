import { createProgram } from "@/lib/actions/partners/create-program";
import { claimDotLinkDomain } from "@/lib/api/domains/claim-dot-link-domain";
import { onboardingStepCache } from "@/lib/api/workspaces/onboarding-step-cache";
import { tokenCache } from "@/lib/auth/token-cache";
import { stripe } from "@/lib/stripe";
import { WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { sendBatchEmail } from "@dub/email";
import UpgradeEmail from "@dub/email/templates/upgrade-email";
import { prisma } from "@dub/prisma";
import { Program, User } from "@dub/prisma/client";
import {
  getPlanAndTierFromPriceId,
  getWorkspaceLimitsForStripeSubscriptionStatus,
  log,
  prettyPrint,
} from "@dub/utils";
import Stripe from "stripe";
import { getPlanPeriodFromStripeSubscription } from "./utils/stripe-plan-period";

export async function checkoutSessionCompleted(event: Stripe.Event) {
  const checkoutSession = event.data.object as Stripe.Checkout.Session;

  if (checkoutSession.mode === "setup") {
    return "Session is setup mode, skipping...";
  }

  if (checkoutSession.mode === "subscription") {
    if (
      checkoutSession.payment_status !== "paid" &&
      checkoutSession.payment_status !== "no_payment_required"
    ) {
      return "Subscription checkout session not completed (payment status), skipping...";
    }
  } else if (checkoutSession.payment_status !== "paid") {
    return "Session is not paid, skipping...";
  }

  if (
    checkoutSession.client_reference_id === null ||
    checkoutSession.customer === null
  ) {
    await log({
      message: "Missing items in Stripe webhook callback",
      type: "errors",
    });
    return "Missing client_reference_id or customer in checkout session.";
  }

  const subscription = await stripe.subscriptions.retrieve(
    checkoutSession.subscription as string,
  );
  const priceId = subscription.items.data[0].price.id;

  const { plan, planTier } = getPlanAndTierFromPriceId({ priceId });

  if (!plan) {
    return `Invalid price ID in checkout.session.completed event: ${priceId}`;
  }

  const limits = getWorkspaceLimitsForStripeSubscriptionStatus({
    planLimits: plan.limits,
    subscriptionStatus: subscription.status,
  });

  const trialEndsAt =
    subscription.status === "trialing" && subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null;

  const stripeId = checkoutSession.customer.toString();
  const workspaceId = checkoutSession.client_reference_id;
  const planName = plan.name.toLowerCase();
  const planPeriod = getPlanPeriodFromStripeSubscription(subscription);

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
      planTier: planTier,
      usageLimit: limits.clicks,
      linksLimit: limits.links,
      payoutsLimit: limits.payouts,
      domainsLimit: limits.domains,
      aiLimit: limits.ai,
      tagsLimit: limits.tags,
      foldersLimit: limits.folders,
      groupsLimit: limits.groups,
      networkInvitesLimit: limits.networkInvites,
      usersLimit: limits.users,
      trialEndsAt,
      paymentFailedAt: null,
      ...(planPeriod !== undefined && { planPeriod }),
    },
    select: {
      plan: true,
      defaultProgramId: true,
      users: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        where: {
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

  const users = workspace.users.map(({ user }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
  }));

  await Promise.allSettled([
    completeOnboarding({ users, workspaceId }),
    sendBatchEmail(
      users.map((user) => ({
        to: user.email as string,
        replyTo: "steven.tey@dub.co",
        subject: `Thank you for upgrading to Dub ${plan.name}!`,
        react: UpgradeEmail({
          name: user.name,
          email: user.email as string,
          plan: plan.name,
          planTier: planTier,
        }),
        variant: "marketing",
      })),
    ),
    // enable dub.link premium default domain for the workspace (not during billing trial)
    ...(subscription.status !== "trialing"
      ? [
          prisma.defaultDomains.update({
            where: {
              projectId: workspaceId,
            },
            data: {
              dublink: true,
            },
          }),
        ]
      : []),
    // expire tokens cache
    tokenCache.expireMany({
      hashedKeys: workspace.restrictedTokens.map(({ hashedKey }) => hashedKey),
    }),
  ]);

  return `Checkout completed for workspace ${workspaceId}, upgraded to ${plan.name}.`;
}

async function completeOnboarding({
  users,
  workspaceId,
}: {
  users: Pick<User, "id" | "email">[];
  workspaceId: string;
}) {
  const workspace = (await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    include: {
      users: true,
      programs: true,
    },
  })) as unknown as (WorkspaceProps & { programs: Program[] }) | null;

  if (!workspace) {
    console.error("Failed to complete onboarding for workspace", workspaceId);
    return;
  }

  await Promise.allSettled([
    // Complete onboarding for workspace users
    onboardingStepCache.mset({
      userIds: users.map(({ id }) => id),
      step: "completed",
    }),

    (async () => {
      // Register saved domain
      const data = await redis.get<{ domain: string; userId: string }>(
        `onboarding-domain:${workspaceId}`,
      );
      if (data && data.domain && data.userId) {
        const { domain, userId } = data;

        try {
          await claimDotLinkDomain({
            domain,
            userId,
            workspace,
          });
          await redis.del(`onboarding-domain:${workspaceId}`);
        } catch (e) {
          console.error(
            "Failed to register saved domain from onboarding",
            { domain, userId, workspace },
            e,
          );
        }
      }

      // Create program
      if (
        users.length > 0 &&
        workspace.programs.length === 0 &&
        workspace.store?.programOnboarding
      ) {
        try {
          await createProgram({
            workspace,
            user: users[0],
          });
        } catch (e) {
          console.error(
            "Failed to create program from onboarding",
            prettyPrint({ workspace, user: users[0] }),
            e,
          );
        }
      }
    })(),
  ]);
}
