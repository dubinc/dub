import { deleteWorkspaceFolders } from "@/lib/api/folders/delete-workspace-folders";
import { deactivateProgram } from "@/lib/api/programs/deactivate-program";
import { tokenCache } from "@/lib/auth/token-cache";
import { syncUserPlanToPlain } from "@/lib/plain/sync-user-plan";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { wouldLosePartnerAccess } from "@/lib/plans/has-partner-access";
import { WorkspaceProps } from "@/lib/types";
import { webhookCache } from "@/lib/webhook/cache";
import { prisma } from "@dub/prisma";
import {
  getPlanAndTierFromPriceId,
  getWorkspaceLimitsForStripeSubscriptionStatus,
} from "@dub/utils";
import { NEW_BUSINESS_PRICE_IDS } from "@dub/utils/src";
import { waitUntil } from "@vercel/functions";
import Stripe from "stripe";

function getTrialEndsAtFromStripeSubscription(
  subscription?: Pick<Stripe.Subscription, "status" | "trial_end">,
): Date | null | undefined {
  if (!subscription) {
    return undefined;
  }
  if (subscription.status === "trialing" && subscription.trial_end) {
    return new Date(subscription.trial_end * 1000);
  }
  return null;
}

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
  > & {
    plan: string;
    restrictedTokens: {
      hashedKey: string;
    }[];
  };
  priceId: string;
  subscription?: Pick<Stripe.Subscription, "status" | "trial_end">;
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

  const trialEndsAt = getTrialEndsAtFromStripeSubscription(subscription);

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
      })
    ) {
      if (workspace.defaultProgramId) {
        await deactivateProgram(workspace.defaultProgramId);
      }
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
