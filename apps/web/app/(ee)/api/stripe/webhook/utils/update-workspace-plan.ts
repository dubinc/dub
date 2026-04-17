import { pauseOrCancelCampaignsForProgramOnPlanDowngrade } from "@/lib/api/campaigns/pause-campaigns-on-plan-downgrade";
import { deleteWorkspaceFolders } from "@/lib/api/folders/delete-workspace-folders";
import { stripAdvancedRewardModifiersForProgram } from "@/lib/api/partners/strip-advanced-reward-modifiers";
import { deactivateProgram } from "@/lib/api/programs/deactivate-program";
import { reactivateProgram } from "@/lib/api/programs/reactivate-program";
import { tokenCache } from "@/lib/auth/token-cache";
import { sendAdvancedDowngradeNoticeEmailIfNeeded } from "@/lib/email/send-advanced-downgrade-notice-email";
import { syncUserPlanToPlain } from "@/lib/plain/sync-user-plan";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import {
  leftAdvancedPlan,
  wouldLoseAdvancedRewardLogic,
} from "@/lib/plans/has-advanced-features";
import {
  wouldGainPartnerAccess,
  wouldLosePartnerAccess,
} from "@/lib/plans/has-partner-access";
import {
  getSubscriptionCancellationFields,
  getSubscriptionTrialEndsAt,
} from "@/lib/stripe/workspace-subscription-fields";
import { WorkspaceProps } from "@/lib/types";
import { webhookCache } from "@/lib/webhook/cache";
import { prisma } from "@dub/prisma";
import {
  getPlanAndTierFromPriceId,
  getWorkspaceLimitsForStripeSubscriptionStatus,
} from "@dub/utils";
import { NEW_BUSINESS_PRICE_IDS } from "@dub/utils/src";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import { getPlanPeriodFromStripeSubscription } from "./stripe-plan-period";

export async function updateWorkspacePlan({
  workspace,
  priceId,
  subscription,
}: {
  workspace: Pick<
    WorkspaceProps,
    | "id"
    | "planTier"
    | "paymentFailedAt"
    | "payoutsLimit"
    | "foldersUsage"
    | "defaultProgramId"
    | "name"
    | "slug"
  > & {
    plan: string;
    restrictedTokens: {
      hashedKey: string;
    }[];
  };
  priceId: string;
  subscription?: Stripe.Subscription;
}) {
  const { plan: newPlan, planTier: newPlanTier } = getPlanAndTierFromPriceId({
    priceId,
  });
  if (!newPlan) return;

  const newPlanName = newPlan.name.toLowerCase();
  const shouldDisableWebhooks = newPlanName === "free" || newPlanName === "pro";

  const { canManageProgram, canMessagePartners } =
    getPlanCapabilities(newPlanName);

  const limits = getWorkspaceLimitsForStripeSubscriptionStatus({
    planLimits: newPlan.limits,
    subscriptionStatus: subscription?.status ?? "active",
  });

  const trialEndsAt = getSubscriptionTrialEndsAt(subscription);
  const cancellationFields = getSubscriptionCancellationFields(subscription);
  const planPeriod = subscription
    ? getPlanPeriodFromStripeSubscription(subscription)
    : undefined;

  // If a workspace upgrades/downgrades their subscription
  // or if the payouts limit increases and the updated price ID is a new business price ID
  // update their usage limit in the database
  if (
    subscription != null ||
    workspace.plan !== newPlanName ||
    workspace.planTier !== newPlanTier ||
    (workspace.payoutsLimit < newPlan.limits.payouts &&
      NEW_BUSINESS_PRICE_IDS.includes(priceId))
  ) {
    const [updatedWorkspace] = await Promise.allSettled([
      prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          plan: newPlanName,
          planTier: newPlanTier,
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
          paymentFailedAt: null,
          ...(trialEndsAt !== undefined && { trialEndsAt }),
          ...cancellationFields,
          ...(planPeriod !== undefined && { planPeriod }),
        },
        include: {
          users: {
            where: {
              role: "owner",
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
            orderBy: {
              createdAt: "asc",
            },
            take: 1,
          },
        },
      }),

      // expire tokens cache
      tokenCache.expireMany({
        hashedKeys: workspace.restrictedTokens.map(
          ({ hashedKey }) => hashedKey,
        ),
      }),

      // if workspace has a program, need to update deactivatedAt and messagingEnabledAt columns based on the plan capabilities
      ...(workspace.defaultProgramId
        ? [
            prisma.program.update({
              where: {
                id: workspace.defaultProgramId,
              },
              data: {
                deactivatedAt: canManageProgram ? null : undefined,
                messagingEnabledAt: canMessagePartners ? new Date() : null,
              },
            }),
          ]
        : []),
    ]);

    // Checkout skips enabling dub.link during Stripe billing trial; turn it on when the
    // subscription becomes active (e.g. trialing → active).
    if (subscription?.status === "active" && newPlanName !== "free") {
      await prisma.defaultDomains.updateMany({
        where: {
          projectId: workspace.id,
          dublink: false,
        },
        data: {
          dublink: true,
        },
      });
    }

    // Disable the webhooks if the new plan does not support webhooks
    if (shouldDisableWebhooks) {
      await Promise.all([
        prisma.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            webhookEnabled: false,
          },
        }),

        prisma.webhook.updateMany({
          where: {
            projectId: workspace.id,
          },
          data: {
            disabledAt: new Date(),
          },
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
    }

    // Delete the folders if the new plan is free
    // For downgrade from Business → Pro, it should be fine since we're accounting that to make sure all folders get write access.
    if (newPlanName === "free") {
      await deleteWorkspaceFolders({
        workspaceId: workspace.id,
        defaultProgramId: workspace.defaultProgramId,
      });
    }

    // Deactivate the program if the workspace loses partner access (Business/Enterprise -> Pro/Free)
    if (
      wouldLosePartnerAccess({
        currentPlan: workspace.plan,
        newPlan: newPlanName,
      }) &&
      workspace.defaultProgramId
    ) {
      await deactivateProgram(workspace.defaultProgramId);
    }

    // Reactivate all partners if the workspace gains partner access (Pro/Free -> Business/Enterprise)
    if (
      wouldGainPartnerAccess({
        currentPlan: workspace.plan,
        newPlan: newPlanName,
      }) &&
      workspace.defaultProgramId
    ) {
      await reactivateProgram(workspace.defaultProgramId);
    }

    if (
      updatedWorkspace.status === "fulfilled" &&
      workspace.defaultProgramId &&
      wouldLoseAdvancedRewardLogic({
        currentPlan: workspace.plan,
        newPlan: newPlanName,
      })
    ) {
      await Promise.all([
        stripAdvancedRewardModifiersForProgram({
          programId: workspace.defaultProgramId,
        }),
        pauseOrCancelCampaignsForProgramOnPlanDowngrade({
          programId: workspace.defaultProgramId,
        }),
      ]);
    }

    if (
      updatedWorkspace.status === "fulfilled" &&
      updatedWorkspace.value.users.length &&
      leftAdvancedPlan({
        currentPlan: workspace.plan,
        newPlan: newPlanName,
      })
    ) {
      const workspaceOwner = updatedWorkspace.value.users[0].user;
      await sendAdvancedDowngradeNoticeEmailIfNeeded({
        projectId: workspace.id,
        dedupeType: `advanced-downgrade-notice:${priceId}`,
        ownerEmail: workspaceOwner.email,
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
      });
    }

    if (
      updatedWorkspace.status === "fulfilled" &&
      updatedWorkspace.value.users.length
    ) {
      const workspaceOwner = updatedWorkspace.value.users[0].user;
      waitUntil(syncUserPlanToPlain(workspaceOwner));
    }
  } else if (workspace.paymentFailedAt) {
    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        paymentFailedAt: null,
      },
    });
  }
}
