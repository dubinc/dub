import { prisma } from "@dub/prisma";
import { CommissionInterval, CommissionType } from "@prisma/client";
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

  await prisma.program.update({
    where: {
      id: programId,
    },
    data: {
      url,
      commissionType:
        reward_type === "amount"
          ? CommissionType.flat
          : CommissionType.percentage,
      commissionAmount:
        reward_type === "amount" ? commission_amount_cents : commission_percent,
      commissionDuration: max_commission_period_months,
      commissionInterval: CommissionInterval.month,
    },
  });

  return await rewardfulImporter.queue({
    programId,
    action: "import-affiliates",
  });
}
