import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { RewardProps } from "@/lib/types";
import { REWARD_EVENT_TO_RESOURCE_TYPE } from "@/lib/zod/schemas/activity-log";
import { prisma } from "@dub/prisma";
import { Reward } from "@dub/prisma/client";
import { ACME_PROGRAM_ID } from "@dub/utils";
import "dotenv-flow/config";

function toRewardActivitySnapshot(reward: RewardProps) {
  return {
    event: reward.event,
    type: reward.type,
    amountInCents: reward.amountInCents ?? null,
    amountInPercentage: reward.amountInPercentage ?? null,
    maxDuration: reward.maxDuration ?? null,
    description: reward.description ?? null,
    tooltipDescription: reward.tooltipDescription ?? null,
    modifiers: reward.modifiers ?? null,
  };
}

// REMOVE the following before running this script:
// - "server-only" from serialize-reward.ts
// - import { logger } from "@/lib/axiom/server" from track-activity-log.ts
async function main() {
  const rewards = await prisma.reward.findMany({
    where: {
      programId: ACME_PROGRAM_ID,
    },
    include: {
      program: true,
      clickPartnerGroup: true,
      leadPartnerGroup: true,
      salePartnerGroup: true,
    },
  });

  if (rewards.length === 0) {
    return;
  }

  await trackActivityLog(
    rewards.map((reward) => ({
      workspaceId: reward.program.workspaceId,
      programId: reward.program.id,
      resourceId: reward.id,
      parentResourceType: "group",
      parentResourceId:
        reward.clickPartnerGroup?.id ??
        reward.leadPartnerGroup?.id ??
        reward.salePartnerGroup?.id,
      resourceType: REWARD_EVENT_TO_RESOURCE_TYPE[reward.event],
      action: "reward.created",
      createdAt: reward.createdAt,
      changeSet: {
        reward: {
          old: null,
          new: toRewardActivitySnapshot(serializeReward(reward as Reward)),
        },
      },
    })),
  );
}

main();
