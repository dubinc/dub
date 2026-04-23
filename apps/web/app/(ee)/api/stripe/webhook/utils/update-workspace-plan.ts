import { pauseOrCancelCampaignsForProgramOnPlanDowngrade } from "@/lib/api/campaigns/pause-campaigns-on-plan-downgrade";
import { deleteWorkspaceFolders } from "@/lib/api/folders/delete-workspace-folders";
import { stripAdvancedRewardModifiersForProgram } from "@/lib/api/partners/strip-advanced-reward-modifiers";
import { deactivateProgram } from "@/lib/api/programs/deactivate-program";
import { reactivateProgram } from "@/lib/api/programs/reactivate-program";
import { tokenCache } from "@/lib/auth/token-cache";
import { syncUserPlanToPlain } from "@/lib/plain/sync-user-plan";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import {
  wouldGainPartnerAccess,
  wouldLosePartnerAccess,
} from "@/lib/plans/has-partner-access";
import { wouldLoseAdvancedFeatures } from "@/lib/plans/would-lose-advanced-features";
import {
  getSubscriptionCancellationFields,
  getSubscriptionTrialEndsAt,
} from "@/lib/stripe/workspace-subscription-fields";
import { WorkspaceProps } from "@/lib/types";
import { webhookCache } from "@/lib/webhook/cache";
import { sendBatchEmail } from "@dub/email";
import AdvancedPlanDowngradeNotice from "@dub/email/templates/advanced-plan-downgrade-notice";
import UpgradeEmail from "@dub/email/templates/upgrade-email";
import { prisma } from "@dub/prisma";
import {
  getPlanAndTierFromPriceId,
  getWorkspaceLimitsForStripeSubscriptionStatus,
} from "@dub/utils";
import { NEW_BUSINESS_PRICE_IDS } from "@dub/utils/src";
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
    | "name"
    | "slug"
    | "defaultProgramId"
    | "planPeriod"
    | "planTier"
    | "trialEndsAt"
    | "paymentFailedAt"
    | "payoutsLimit"
    | "foldersUsage"
  > & {
    plan: string;
    restrictedTokens: {
      hashedKey: string;
    }[];
  };
  priceId: string;
  subscription: Stripe.Subscription;
}) {
  const { plan: newPlan, planTier: newPlanTier } = getPlanAndTierFromPriceId({
    priceId,
  });
  if (!newPlan) return;

  const newPlanName = newPlan.name.toLowerCase();

  const { canMessagePartners, canCreateWebhooks, canAddFolder } =
    getPlanCapabilities(newPlanName);

  const limits = getWorkspaceLimitsForStripeSubscriptionStatus({
    planLimits: newPlan.limits,
    subscriptionStatus: subscription.status,
  });

  const trialEndsAt = getSubscriptionTrialEndsAt(subscription);
  const isPaidPlanActivated =
    workspace.trialEndsAt !== null && trialEndsAt === null;
  const cancellationFields = getSubscriptionCancellationFields(subscription);
  const planPeriod = getPlanPeriodFromStripeSubscription(subscription);

  // Update workspace plan / limits / subscription details if:
  // - workspace upgrades/downgrades their subscription
  // - workspace changes their plan period / tier
  // - trialEndsAt changes (i.e. free trial -> paid subscription)
  // - the payouts limit increases and the updated price ID is a new business price ID
  if (
    workspace.plan !== newPlanName ||
    workspace.planPeriod !== planPeriod ||
    workspace.planTier !== newPlanTier ||
    isPaidPlanActivated ||
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
          ...(["active", "trialing"].includes(subscription.status)
            ? { paymentFailedAt: null }
            : {}),
          ...(trialEndsAt !== undefined && { trialEndsAt }),
          ...cancellationFields,
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
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      }),

      // expire tokens cache
      tokenCache.expireMany({
        hashedKeys: workspace.restrictedTokens.map(
          ({ hashedKey }) => hashedKey,
        ),
      }),
      ...(workspace.defaultProgramId
        ? [
            prisma.program.update({
              where: {
                id: workspace.defaultProgramId,
              },
              data: {
                messagingEnabledAt: canMessagePartners ? new Date() : null,
              },
            }),
          ]
        : []),
    ]);

    // Disable the webhooks if the new plan does not support webhooks
    if (!canCreateWebhooks) {
      await Promise.allSettled([
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

    // Delete the folders if the new plan does not support folders
    // For downgrade from Business → Pro, it should be fine since we're accounting that to make sure all folders get write access.
    if (!canAddFolder) {
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

    const workspaceOwners =
      updatedWorkspace.status === "fulfilled"
        ? updatedWorkspace.value.users.map((user) => user.user)
        : [];

    if (
      workspace.defaultProgramId &&
      wouldLoseAdvancedFeatures({
        currentPlan: workspace.plan,
        newPlan: newPlanName,
      })
    ) {
      await Promise.allSettled([
        stripAdvancedRewardModifiersForProgram({
          programId: workspace.defaultProgramId,
        }),
        pauseOrCancelCampaignsForProgramOnPlanDowngrade({
          programId: workspace.defaultProgramId,
        }),
        workspaceOwners.length > 0 &&
          sendBatchEmail(
            workspaceOwners.map((owner) => ({
              to: owner.email!,
              subject: "Your Advanced plan features have been removed",
              react: AdvancedPlanDowngradeNotice({
                email: owner.email!,
                workspace: {
                  name: workspace.name,
                  slug: workspace.slug,
                },
              }),
              variant: "notifications",
              headers: {
                "Idempotency-Key": `advanced-downgrade-notice:${workspace.id}:${owner.email}`,
              },
            })),
          ),
      ]);
    }

    if (workspaceOwners.length > 0) {
      await Promise.allSettled([
        ...(isPaidPlanActivated
          ? [
              // send thank you email to workspace owners
              sendBatchEmail(
                workspaceOwners.map((user) => ({
                  to: user.email as string,
                  replyTo: "steven.tey@dub.co",
                  subject: `Thank you for upgrading to Dub ${newPlan.name}!`,
                  react: UpgradeEmail({
                    name: user.name,
                    email: user.email as string,
                    plan: newPlan.name,
                    planTier: newPlanTier,
                  }),
                  variant: "marketing",
                })),
              ),
            ]
          : []),
        ...workspaceOwners.map((owner) => syncUserPlanToPlain(owner)),
      ]);
    }
  }
}
