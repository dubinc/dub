"use server";

import { trackRewardActivityLog } from "@/lib/api/activity-log/track-reward-activity-log";
import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { queueRewardProcessing } from "@/lib/api/rewards/queue-reward-processing";
import {
  releaseRewardGroupLock,
  reserveRewardGroupLock,
} from "@/lib/api/rewards/reward-group-lock";
import { validateReward } from "@/lib/api/rewards/validate-reward";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import {
  REWARD_EVENT_COLUMN_MAPPING,
  updateRewardSchema,
} from "@/lib/zod/schemas/rewards";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { prisma } from "@dub/prisma";
import { Prisma, Program, Reward } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
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

    const { canUseAdvancedRewardLogic, canCreateReferralReward } =
      getPlanCapabilities(workspace.plan);

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

    validateReward({
      ...parsedInput,
      event: reward.event,
    });

    const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

    const group = await prisma.partnerGroup.findFirst({
      where: {
        [rewardIdColumn]: reward.id,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!group) {
      throw new Error("Partner group not found.");
    }

    const operationId = nanoid(10);

    await reserveRewardGroupLock({
      groupId: group.id,
      event: reward.event,
      operationId,
    });

    let updatedReward:
      | (Reward & {
          program: Pick<Program, "id" | "slug" | "addedToMarketplaceAt"> | null;
        })
      | null = null;

    try {
      updatedReward = await prisma.reward.update({
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
          program: {
            select: {
              id: true,
              slug: true,
              addedToMarketplaceAt: true,
            },
          },
        },
      });

      await queueRewardProcessing({
        event: "reward-updated",
        payload: {
          groupId: group.id,
          rewardId: reward.id,
          occurredAt: new Date().toISOString(),
          operationId,
          rewardSnapshot: {
            description: formatRewardDescription(
              serializeReward(updatedReward),
              {
                includeEarnPrefix: false,
              },
            ),
          },
        },
      });
    } catch (error) {
      await releaseRewardGroupLock({
        groupId: group.id,
        event: reward.event,
        operationId,
      });

      throw error;
    }

    const { program, ...rewardMetadata } = updatedReward;
    const isDefaultGroup = group.slug === DEFAULT_PARTNER_GROUP.slug;

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
          parentResourceId: group.id,
          old: reward,
          new: updatedReward,
        }),

        // we only cache default group pages for now so we need to invalidate them
        ...(isDefaultGroup && program
          ? [
              revalidatePath(`/partners.dub.co/${program.slug}`),
              revalidatePath(`/partners.dub.co/${program.slug}/apply`),
              program.addedToMarketplaceAt &&
                revalidatePath(
                  `/partners.dub.co/programs/marketplace/${program.slug}`,
                ),
            ]
          : []),
      ]),
    );
  });
