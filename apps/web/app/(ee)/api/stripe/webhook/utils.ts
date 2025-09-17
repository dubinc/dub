import { deleteWorkspaceFolders } from "@/lib/api/folders/delete-workspace-folders";
import { tokenCache } from "@/lib/auth/token-cache";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { WorkspaceProps } from "@/lib/types";
import { webhookCache } from "@/lib/webhook/cache";
import { sendEmail } from "@dub/email";
import { prisma } from "@dub/prisma";
import { getPlanFromPriceId } from "@dub/utils";
import { NEW_BUSINESS_PRICE_IDS } from "@dub/utils/src";
import Stripe from "stripe";

const cancellationReasonMap = {
  customer_service: "you had a bad experience with our customer service",
  low_quality: "the product didn't meet your expectations",
  missing_features: "you were expecting more features",
  switched_service: "you switched to a different service",
  too_complex: "the product was too complex",
  too_expensive: "the product was too expensive",
  unused: "you didn't use the product",
};

export async function sendCancellationFeedback({
  owners,
  reason,
}: {
  owners: {
    name: string | null;
    email: string | null;
  }[];
  reason?: Stripe.Subscription.CancellationDetails.Feedback | null;
}) {
  const reasonText = reason ? cancellationReasonMap[reason] : "";

  return await Promise.all(
    owners.map(
      (owner) =>
        owner.email &&
        sendEmail({
          to: owner.email,
          from: "Steven Tey <steven@dub.co>",
          replyTo: "steven.tey@dub.co",
          subject: "Feedback for Dub.co?",
          text: `Hey ${owner.name ? owner.name.split(" ")[0] : "there"}!\n\nSaw you canceled your Dub subscription${reasonText ? ` and mentioned that ${reasonText}` : ""} – do you mind sharing if there's anything we could've done better on our side?\n\nWe're always looking to improve our product offering so any feedback would be greatly appreciated!\n\nThank you so much in advance!\n\nBest,\nSteven Tey\nFounder, Dub.co`,
        }),
    ),
  );
}

export async function updateWorkspacePlan({
  workspace,
  plan,
  priceId,
}: {
  workspace: Pick<
    WorkspaceProps,
    | "id"
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
  plan: ReturnType<typeof getPlanFromPriceId>;
  priceId: string;
}) {
  if (!plan) {
    return;
  }

  const newPlanName = plan.name.toLowerCase();
  const shouldDisableWebhooks = newPlanName === "free" || newPlanName === "pro";
  const shouldDeleteFolders =
    newPlanName === "free" && workspace.foldersUsage > 0;

  // If a workspace upgrades/downgrades their subscription
  // or if the payouts limit increases and the updated price ID is a new business price ID
  // update their usage limit in the database
  if (
    workspace.plan !== newPlanName ||
    (workspace.payoutsLimit < plan.limits.payouts &&
      NEW_BUSINESS_PRICE_IDS.includes(priceId))
  ) {
    await Promise.allSettled([
      prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          plan: newPlanName,
          usageLimit: plan.limits.clicks!,
          linksLimit: plan.limits.links!,
          payoutsLimit: plan.limits.payouts!,
          domainsLimit: plan.limits.domains!,
          aiLimit: plan.limits.ai!,
          tagsLimit: plan.limits.tags!,
          foldersLimit: plan.limits.folders!,
          groupsLimit: plan.limits.groups!,
          usersLimit: plan.limits.users!,
          paymentFailedAt: null,
          ...(shouldDeleteFolders && { foldersUsage: 0 }),
        },
      }),

      prisma.restrictedToken.updateMany({
        where: {
          projectId: workspace.id,
        },
        data: {
          rateLimit: plan.limits.api,
        },
      }),

      // expire tokens cache
      tokenCache.expireMany({
        hashedKeys: workspace.restrictedTokens.map(
          ({ hashedKey }) => hashedKey,
        ),
      }),

      // disable/enable program messaging if workspace has a program
      ...(workspace.defaultProgramId
        ? [
            prisma.program.update({
              where: {
                id: workspace.defaultProgramId,
              },
              data: {
                messagingEnabledAt: getPlanCapabilities(workspace.plan)
                  .canMessagePartners
                  ? new Date()
                  : null,
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
    if (shouldDeleteFolders) {
      await deleteWorkspaceFolders({
        workspaceId: workspace.id,
      });
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
