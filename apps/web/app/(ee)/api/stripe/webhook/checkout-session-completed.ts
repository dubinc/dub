import { createProgram } from "@/lib/actions/partners/create-program";
import { claimDotLinkDomain } from "@/lib/api/domains/claim-dot-link-domain";
import { reactivateProgram } from "@/lib/api/programs/reactivate-program";
import { onboardingStepCache } from "@/lib/api/workspaces/onboarding-step-cache";
import { tokenCache } from "@/lib/auth/token-cache";
import { wouldGainPartnerAccess } from "@/lib/plans/has-partner-access";
import { stripe } from "@/lib/stripe";
import { WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { sendBatchEmail } from "@dub/email";
import TrialStartedEmail from "@dub/email/templates/trial/trial-started";
import UpgradeEmail from "@dub/email/templates/upgrade-email";
import { prisma } from "@dub/prisma";
import { Program, User } from "@dub/prisma/client";
import {
  getPlanAndTierFromPriceId,
  getWorkspaceLimitsForStripeSubscriptionStatus,
  isWorkspaceBillingTrialActive,
  log,
} from "@dub/utils";
import Stripe from "stripe";
import { getPlanPeriodFromStripeSubscription } from "./utils/stripe-plan-period";

export async function checkoutSessionCompleted(
  event: Stripe.CheckoutSessionCompletedEvent,
) {
  const checkoutSession = event.data.object;

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
  } else {
    return `Session mode ${checkoutSession.mode} is not handled here, skipping...`;
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

  const updatedWorkspace = await prisma.project.update({
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
    include: {
      users: {
        where: {
          role: "owner",
          user: {
            isMachine: false,
          },
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
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

  const users = updatedWorkspace.users.map(({ user }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
  }));

  await Promise.allSettled([
    completeOnboarding({ users, workspaceId }),
    // if workspace had a program from before and is upgrading to an eligible plan, reactivate it
    updatedWorkspace.defaultProgramId &&
      wouldGainPartnerAccess({
        currentPlan: "free",
        newPlan: updatedWorkspace.plan,
      }) &&
      reactivateProgram(updatedWorkspace.defaultProgramId),
    // If trial + no program (Links trial), send TrialStartedEmail – for program trial we send it in create-program.ts
    // else, we send Upgrade thank you email
    // TODO: Only send TrialStartedEmail once we remove the trial feature flag
    isWorkspaceBillingTrialActive(trialEndsAt) &&
    !updatedWorkspace.store?.["programOnboarding"]
      ? sendBatchEmail(
          users.map((user) => ({
            to: user.email as string,
            replyTo: "steven.tey@dub.co",
            subject: "Welcome to your 14-day Dub trial",
            react: TrialStartedEmail({
              email: user.email as string,
              plan: plan.name,
              workspace: {
                slug: updatedWorkspace.slug,
                logo: updatedWorkspace.logo,
                name: updatedWorkspace.name,
              },
            }),
            variant: "marketing",
          })),
        )
      : sendBatchEmail(
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
    // expire tokens cache
    tokenCache.expireMany({
      hashedKeys: updatedWorkspace.restrictedTokens.map(
        ({ hashedKey }) => hashedKey,
      ),
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

  const results = await Promise.allSettled([
    onboardingStepCache.mset({
      userIds: users.map(({ id }) => id),
      step: "completed",
    }),

    // Create program based on programOnboarding data
    users.length > 0 &&
      workspace.programs.length === 0 &&
      workspace.store?.programOnboarding &&
      createProgram({
        workspace,
        user: users[0],
      }),

    // Claim saved domain (only if not on trial)
    !isWorkspaceBillingTrialActive(workspace.trialEndsAt) &&
      (async () => {
        // Register saved domain
        const data = await redis.get<{ domain: string; userId: string }>(
          `onboarding-domain:${workspaceId}`,
        );
        if (data && data.domain && data.userId) {
          const { domain, userId } = data;

          await claimDotLinkDomain({
            domain,
            userId,
            workspace,
          });
        }
      })(),
  ]);

  if (results.some((result) => result.status === "rejected")) {
    results.forEach((result, idx) => {
      if (result.status === "rejected") {
        console.error(
          `Failed to ${["update onboardingStepCache", "create program", "claim saved domain"][idx]} from onboarding: ${JSON.stringify(result.reason, null, 2)}`,
        );
      }
    });
  }
}
