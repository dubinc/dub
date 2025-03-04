import { prisma } from "@dub/prisma";
import { CommissionType, EventType } from "@dub/prisma/client";
import { createId } from "../api/utils";
import { RewardfulApi } from "./api";
import { rewardfulImporter } from "./importer";

export async function importCampaign({ programId }: { programId: string }) {
  const { defaultRewardId, workspaceId } =
    await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
    });

  const { token, campaignId } =
    await rewardfulImporter.getCredentials(workspaceId);

  const rewardfulApi = new RewardfulApi({ token });

  const campaign = await rewardfulApi.retrieveCampaign(campaignId);

  const {
    commission_amount_cents,
    commission_percent,
    max_commission_period_months,
    reward_type,
  } = campaign;

  const newReward = {
    programId,
    event: EventType.sale,
    maxDuration: max_commission_period_months,
    type:
      reward_type === "amount"
        ? CommissionType.flat
        : CommissionType.percentage,
    amount:
      reward_type === "amount" ? commission_amount_cents : commission_percent,
  };

  let rewardId: string | null = null;

  const rewardFound = await prisma.reward.findFirst({
    where: newReward,
  });

  if (!rewardFound) {
    const reward = await prisma.reward.create({
      data: {
        id: createId({ prefix: "rw_" }),
        ...newReward,
      },
    });

    if (!defaultRewardId) {
      await prisma.program.update({
        where: {
          id: programId,
        },
        data: {
          defaultRewardId: reward.id,
        },
      });
    }

    rewardId = reward.id;
  } else {
    rewardId = rewardFound.id;
  }

  return await rewardfulImporter.queue({
    programId,
    // we will only need to assign rewardId to affiliates
    // if it's not the defaultRewardId of the program (there's already a defaultRewardId)
    ...(defaultRewardId && { rewardId }),
    action: "import-affiliates",
  });
}
