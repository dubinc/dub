import { prisma } from "@dub/prisma";
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

  const program = await prisma.program.update({
    where: {
      id: programId,
    },
    data: {
      url,
    },
  });

  if (!program.defaultRewardId) {
    const reward = await prisma.reward.create({
      data: {
        programId,
        event: "sale",
        maxDuration: max_commission_period_months,
        type: reward_type === "amount" ? "flat" : "percentage",
        amount:
          reward_type === "amount"
            ? commission_amount_cents
            : commission_percent,
      },
    });

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
    action: "import-affiliates",
  });
}
