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
    url,
    commission_amount_cents,
    commission_percent,
    max_commission_period_months,
    reward_type,
  } = campaign;

  const { defaultRewardId } = await prisma.program.update({
    where: {
      id: programId,
    },
    data: {
      url,
    },
  });

  const reward = await prisma.reward.create({
    data: {
      id: createId({ prefix: "rew_" }),
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
    ...(defaultRewardId && { rewardId: reward.id }),
    action: "import-affiliates",
  });
}
