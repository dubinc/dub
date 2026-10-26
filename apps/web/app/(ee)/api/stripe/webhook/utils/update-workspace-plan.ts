import { recomputeWorkspaceUsage } from "@/lib/api/billing/recompute-workspace-usage";
import { deleteWorkspaceFolders } from "@/lib/api/folders/delete-workspace-folders";
import { tokenCache } from "@/lib/auth/token-cache";
import { syncUserPlanToPlain } from "@/lib/plain/sync-user-plan";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import {
  getSubscriptionBillingFields,
  getSubscriptionTrialEndsAt,
} from "@/lib/stripe/workspace-subscription-fields";
import { WorkspaceProps } from "@/lib/types";
import { sendBatchEmail } from "@dub/email";
import UpgradeEmail from "@dub/email/templates/upgrade-email";
import { getPlanAndTierFromPriceId } from "@dub/utils";
import type Stripe from "stripe";
import { getPlanPeriodFromStripeSubscription } from "./get-plan-period-from-stripe-subscription";
import { getWorkspaceLimitsFromStripeSubscription } from "./get-workspace-limits-from-stripe-subscription";

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
    | "planPeriod"
    | "planTier"
    | "trialEndsAt"
    | "billingCycleEndsAt"
    | "subscriptionCanceledAt"
    | "billingCycleStart"
  > & {
    plan: string;
    restrictedTokens: {
      hashedKey: string;
    }[];
  };
  priceId: string;
  subscription: Stripe.Subscription;
}) {
  const subscriptionBillingFields = getSubscriptionBillingFields(subscription);
  const planPeriod = getPlanPeriodFromStripeSubscription(subscription);
  const trialEndsAt = getSubscriptionTrialEndsAt(subscription);
  const isPaidPlanActivated =
    workspace.trialEndsAt !== null && trialEndsAt === null;

  const datetimeFieldsUpdated =
    workspace.billingCycleStart !==
      subscriptionBillingFields.billingCycleStart ||
    workspace.billingCycleEndsAt?.getTime() !==
      subscriptionBillingFields.billingCycleEndsAt?.getTime() ||
    workspace.subscriptionCanceledAt?.getTime() !==
      subscriptionBillingFields.subscriptionCanceledAt?.getTime() ||
    (trialEndsAt !== undefined &&
      workspace.trialEndsAt?.getTime() !== trialEndsAt?.getTime());

  const { plan: newPlan, planTier: newPlanTier } = getPlanAndTierFromPriceId({
    priceId,
  });

  // if not a hardcoded price ID (e.g. Enterprise plans), update billingCycleEndsAt and planPeriod
  if (!newPlan) {
    console.log(
      `Not a hardcoded price ID, updating billingCycleEndsAt and planPeriod for workspace ${workspace.id}`,
    );
    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        ...subscriptionBillingFields,
        planPeriod,
      },
    });
    return;
  }

  const newPlanName = newPlan.name.toLowerCase();

  const { canCreateWebhooks, canAddFolder } = getPlanCapabilities(newPlanName);

  const limits = getWorkspaceLimitsFromStripeSubscription({
    planLimits: newPlan.limits,
    subscription,
  });

  const isYearlyToMonthly =
    workspace.planPeriod === "yearly" && planPeriod === "monthly";

  const recomputedUsage = isYearlyToMonthly
    ? await recomputeWorkspaceUsage(workspace)
    : null;

  // Update workspace plan / limits / subscription details if:
  // - workspace upgrades/downgrades their subscription
  // - workspace changes their plan period / tier
  // - trialEndsAt changes (i.e. free trial -> paid subscription)
  if (
    workspace.plan !== newPlanName ||
    workspace.planPeriod !== planPeriod ||
    workspace.planTier !== newPlanTier ||
    isPaidPlanActivated
  ) {
    // A failed write must throw so the Stripe retry runs this block again
    const updatedWorkspace = await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        plan: newPlanName,
        planTier: newPlanTier,
        usageLimit: limits.clicks,
        linksLimit: limits.links,
        domainsLimit: limits.domains,
        aiLimit: limits.ai,
        tagsLimit: limits.tags,
        foldersLimit: limits.folders,
        usersLimit: limits.users,
        ...(["active", "trialing"].includes(subscription.status)
          ? { paymentFailedAt: null }
          : {}),
        ...(trialEndsAt !== undefined && { trialEndsAt }),
        ...subscriptionBillingFields,
        ...(planPeriod !== undefined && { planPeriod }),
        ...(recomputedUsage && {
          usage: recomputedUsage.usage,
          linksUsage: recomputedUsage.linksUsage,
          sentEmails: {
            deleteMany: {
              type: {
                in: [
                  "firstUsageLimitEmail",
                  "secondUsageLimitEmail",
                  "firstLinksLimitEmail",
                  "secondLinksLimitEmail",
                ],
              },
            },
          },
        }),
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
    });

    // The plan is saved at this point. A failure here must not stop the steps
    // below, because a Stripe retry skips this block once the plan matches.
    await Promise.allSettled([
      // Expire tokens cache
      tokenCache.expireMany({
        hashedKeys: workspace.restrictedTokens.map(
          ({ hashedKey }) => hashedKey,
        ),
      }),
    ]);

    console.log(
      `Updated workspace ${workspace.id} plan / limits / subscription details.`,
    );

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
    }

    // Delete the folders if the new plan does not support folders
    // For downgrade from Business → Pro, it should be fine since we're accounting that to make sure all folders get write access.
    if (!canAddFolder) {
      await deleteWorkspaceFolders({
        workspaceId: workspace.id,
      });
      console.log(`Deleted folders for workspace ${workspace.id}.`);
    }

    const workspaceOwners = updatedWorkspace.users.map((user) => user.user);

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
                  }),
                  variant: "marketing",
                })),
              ),
            ]
          : []),
        ...workspaceOwners.map((owner) => syncUserPlanToPlain(owner)),
      ]);
      console.log(
        `Sent thank you emails to ${workspaceOwners.length} workspace owners for workspace ${workspace.slug}.`,
      );
    }
  } else if (datetimeFieldsUpdated) {
    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        ...subscriptionBillingFields,
        ...(trialEndsAt !== undefined && { trialEndsAt }),
      },
    });
    console.log(`Updated workspace ${workspace.id} datetime fields`);
  } else {
    console.log(
      `No plan or datetime field updates for workspace ${workspace.id}, skipping...`,
    );
  }
}
