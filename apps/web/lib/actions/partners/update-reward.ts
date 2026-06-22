"use server";

import { trackRewardActivityLog } from "@/lib/api/activity-log/track-reward-activity-log";
import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { queueRewardProcessing } from "@/lib/api/rewards/queue-reward-processing";
import { validateReward } from "@/lib/api/rewards/validate-reward";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { updateRewardSchema } from "@/lib/zod/schemas/rewards";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { revalidatePath } from "next/cache";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const updateRewardAction = authActionClient
  .inputSchema(updateRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      type,
      amountInCents,
      amountInPercentage,
      maxDuration,
      description,
      tooltipDescription,
      modifiers,
      config,
      rewardId,
      spendLimitAmount,
      spendLimitInterval,
    } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const reward = await getRewardOrThrow({
      rewardId,
      programId,
    });

    const {
      canUseAdvancedRewardLogic,
      canSetRewardSpendLimit,
      canCreateReferralReward,
    } = getPlanCapabilities(workspace.plan);

    if (reward.event === "referral" && !canCreateReferralReward) {
      throw new Error(
        "Referral rewards are only available on the Advanced plan and above.",
      );
    }

    if (modifiers && !canUseAdvancedRewardLogic) {
      throw new Error(
        "Advanced reward structures are only available on the Advanced plan and above.",
      );
    }

    if ((spendLimitAmount || spendLimitInterval) && !canSetRewardSpendLimit) {
      throw new Error(
        "Spend limits are only available on the Enterprise plan.",
      );
    }

    validateReward({
      ...parsedInput,
      event: reward.event,
    });

    const updatedReward = await prisma.reward.update({
      where: {
        id: rewardId,
      },
      data: {
        type,
        maxDuration,
        description: description || null,
        tooltipDescription: tooltipDescription || null,
        modifiers: modifiers === null ? Prisma.DbNull : modifiers,
        config: config === null ? Prisma.DbNull : config,
        spendLimitAmount,
        spendLimitInterval,
        ...(type === "flat"
          ? {
              amountInCents,
              amountInPercentage: null,
            }
          : {
              amountInCents: null,
              amountInPercentage: new Prisma.Decimal(amountInPercentage!),
            }),
      },
      include: {
        program: true,
        clickPartnerGroup: true,
        leadPartnerGroup: true,
        salePartnerGroup: true,
        referralPartnerGroup: true,
      },
    });

    const {
      program,
      clickPartnerGroup,
      leadPartnerGroup,
      salePartnerGroup,
      referralPartnerGroup,
      ...rewardMetadata
    } = updatedReward;

    const isDefaultGroup = [
      clickPartnerGroup,
      leadPartnerGroup,
      salePartnerGroup,
      referralPartnerGroup,
    ].some((group) => group?.slug === "default");

    // Determine the groupId from the partner group relation
    const partnerGroup =
      clickPartnerGroup ||
      leadPartnerGroup ||
      salePartnerGroup ||
      referralPartnerGroup;

    if (!partnerGroup) {
      throw new Error("Partner group not found.");
    }

    await queueRewardProcessing({
      event: "reward-updated",
      groupId: partnerGroup.id,
      occurredAt: new Date().toISOString(),
      rewardSnapshot: {
        id: reward.id,
        event: reward.event,
        description: formatRewardDescription(serializeReward(updatedReward), {
          includeEarnPrefix: false,
        }),
      },
    });

    waitUntil(
      Promise.allSettled([
        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "reward.updated",
          description: `Reward ${rewardId} updated`,
          actor: user,
          targets: [
            {
              type: "reward",
              id: rewardId,
              metadata: serializeReward(rewardMetadata),
            },
          ],
        }),

        trackRewardActivityLog({
          workspaceId: workspace.id,
          programId,
          userId: user.id,
          resourceId: rewardMetadata.id,
          parentResourceType: "group",
          parentResourceId: partnerGroup.id,
          old: reward,
          new: updatedReward,
        }),

        // we only cache default group pages for now so we need to invalidate them
        ...(isDefaultGroup && program
          ? [
              revalidatePath(`/partners.dub.co/${program.slug}`),
              revalidatePath(`/partners.dub.co/${program.slug}/apply`),
              program.addedToMarketplaceAt &&
                revalidatePath(`/partners.dub.co/marketplace/${program.slug}`),
            ]
          : []),
      ]),
    );
  });
