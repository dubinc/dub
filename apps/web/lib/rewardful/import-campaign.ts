import { prisma } from "@dub/prisma";
import { createId } from "../api/utils";
import { RewardfulApi } from "./api";
import { rewardfulImporter } from "./importer";

export async function importCampaign({ programId }: { programId: string }) {
  const { token, campaignId } =
    await rewardfulImporter.getCredentials(programId);

  const rewardfulApi = new RewardfulApi({ token });

  const campaign = await rewardfulApi.retrieveCampaign(campaignId);

  const {
    commission_amount_cents,
    commission_percent,
    max_commission_period_months,
    reward_type,
  } = campaign;

  const { defaultRewardId } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const reward = await prisma.reward.create({
    data: {
      id: createId({ prefix: "rw_" }),
      programId,
      event: "sale",
      maxDuration: max_commission_period_months,
      type: reward_type === "amount" ? "flat" : "percentage",
      amount:
        reward_type === "amount" ? commission_amount_cents : commission_percent,
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

  return await rewardfulImporter.queue({
    programId,
    // we will only need to assign rewardId to affiliates
    // if it's not the defaultRewardId of the program (there's already a defaultRewardId)
    ...(defaultRewardId && { rewardId: reward.id }),
    action: "import-affiliates",
  });
}
