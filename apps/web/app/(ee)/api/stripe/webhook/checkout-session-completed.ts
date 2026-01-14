import { createProgram } from "@/lib/actions/partners/create-program";
import { claimDotLinkDomain } from "@/lib/api/domains/claim-dot-link-domain";
import { onboardingStepCache } from "@/lib/api/workspaces/onboarding-step-cache";
import { tokenCache } from "@/lib/auth/token-cache";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { stripe } from "@/lib/stripe";
import { ProgramData, WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { sendBatchEmail } from "@dub/email";
import UpgradeEmail from "@dub/email/templates/upgrade-email";
import { prisma } from "@dub/prisma";
import { User } from "@dub/prisma/client";
import { getPlanAndTierFromPriceId, log } from "@dub/utils";
import Stripe from "stripe";

export async function checkoutSessionCompleted(event: Stripe.Event) {
  const checkoutSession = event.data.object as Stripe.Checkout.Session;

  if (
    checkoutSession.mode === "setup" ||
    checkoutSession.payment_status !== "paid"
  ) {
    return;
  }

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

  const { plan, planTier } = getPlanAndTierFromPriceId({ priceId });

  if (!plan) {
    console.log(
      `Invalid price ID in checkout.session.completed event: ${priceId}`,
    );
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
      planTier: planTier,
      usageLimit: plan.limits.clicks,
      linksLimit: plan.limits.links,
      payoutsLimit: plan.limits.payouts,
      domainsLimit: plan.limits.domains,
      aiLimit: plan.limits.ai,
      tagsLimit: plan.limits.tags,
      foldersLimit: plan.limits.folders,
      groupsLimit: plan.limits.groups,
      networkInvitesLimit: plan.limits.networkInvites,
      usersLimit: plan.limits.users,
      paymentFailedAt: null,
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
    // enable dub.link premium default domain for the workspace
    prisma.defaultDomains.update({
      where: {
        projectId: workspaceId,
      },
      data: {
        dublink: true,
      },
    }),
    // expire tokens cache
    tokenCache.expireMany({
      hashedKeys: workspace.restrictedTokens.map(({ hashedKey }) => hashedKey),
    }),

    // enable program messaging if available
    ...(workspace.defaultProgramId &&
    getPlanCapabilities(workspace.plan).canMessagePartners
      ? [
          prisma.program.update({
            where: {
              id: workspace.defaultProgramId,
            },
            data: {
              messagingEnabledAt: new Date(),
            },
          }),
        ]
      : []),
  ]);
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
    },
  })) as unknown as WorkspaceProps | null;

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

      console.log("CREATING PROGRAM?", {
        store: workspace.store,
        programOnboarding: workspace.store?.programOnboarding,
      });

      // Create program
      if (
        workspace.store?.programOnboarding &&
        (workspace.store.programOnboarding as ProgramData).lastCompletedStep ===
          "configure-reward"
      ) {
        console.log("CREATING PROGRAM...");
        try {
          await createProgram({
            workspace,
            user: users[0],
          });
        } catch (e) {
          console.error(
            "Failed to create program from onboarding",
            { workspace, user: users[0] },
            e,
          );
        }
      }
    })(),
  ]);
}
