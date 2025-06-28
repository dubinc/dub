import { prisma } from "@dub/prisma";
import { EventType, RewardStructure } from "@dub/prisma/client";
import { createId } from "../api/create-id";
import { DUB_MIN_PAYOUT_AMOUNT_CENTS } from "../partners/constants";
import { RewardfulApi } from "./api";
import { rewardfulImporter } from "./importer";

export async function importCampaign({ programId }: { programId: string }) {
  const { workspaceId, rewards: defaultSaleReward } =
    await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      include: {
        rewards: {
          where: {
            event: EventType.sale,
            default: true,
          },
        },
      },
    });

  const { token, campaignId } =
    await rewardfulImporter.getCredentials(workspaceId);

  const rewardfulApi = new RewardfulApi({ token });

  const campaign = await rewardfulApi.retrieveCampaign(campaignId);

  const {
    commission_amount_cents,
    minimum_payout_cents,
    commission_percent,
    max_commission_period_months,
    days_until_commissions_are_due,
    reward_type,
  } = campaign;

  const newReward = {
    programId,
    event: EventType.sale,
    maxDuration: max_commission_period_months,
    type:
      reward_type === "amount"
        ? RewardStructure.flat
        : RewardStructure.percentage,
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
        ...newReward,
        id: createId({ prefix: "rw_" }),
        default: !defaultSaleReward.length,
      },
    });

    // if there's no default reward, means that this is a newly imported program
    if (!defaultSaleReward.length) {
      await prisma.program.update({
        where: {
          id: programId,
        },
        data: {
          // minimum payout amount is the max of the Rewardful campaign minimum payout and Dub's minimum payout ($100)
          minPayoutAmount: Math.max(
            minimum_payout_cents,
            DUB_MIN_PAYOUT_AMOUNT_CENTS,
          ),
          holdingPeriodDays: days_until_commissions_are_due,
        },
      });
    }

    rewardId = reward.id;
  } else {
    rewardId = rewardFound.id;
  }

  return await rewardfulImporter.queue({
    programId,
    ...(rewardId && { rewardId }),
    action: "import-affiliates",
  });
}
