import { RESOURCE_COLORS } from "@/ui/colors";
import { prisma } from "@dub/prisma";
import { EventType, RewardStructure } from "@dub/prisma/client";
import { randomValue } from "@dub/utils";
import { differenceInSeconds } from "date-fns";
import { createId } from "../api/create-id";
import { RewardfulApi } from "./api";
import { rewardfulImporter } from "./importer";
import { RewardfulImportPayload } from "./types";

export async function importCampaign(payload: RewardfulImportPayload) {
  const { programId, campaignId } = payload;

  const { workspaceId } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const { token } = await rewardfulImporter.getCredentials(workspaceId);

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

  const groupSlug = `rewardful-${campaignId}`;
  const createdGroup = await prisma.partnerGroup.upsert({
    where: {
      programId_slug: {
        programId,
        slug: groupSlug,
      },
    },
    update: {},
    create: {
      id: createId({ prefix: "grp_" }),
      programId,
      name: `(Rewardful) ${campaign.name}`,
      slug: groupSlug,
      color: randomValue(RESOURCE_COLORS),
    },
  });

  console.log(
    `Upserted group ${createdGroup.name} (${createdGroup.id}) matching Rewardful campaign ${campaign.name} (${campaignId}).`,
  );

  const createdSecondsAgo = differenceInSeconds(
    new Date(),
    createdGroup.createdAt,
  );
  console.log(
    `This group was created ${createdSecondsAgo} seconds ago (most likely ${createdSecondsAgo < 10 ? "created" : "upserted"})`,
  );

  const groupId = createdGroup.id;

  if (!createdGroup.saleRewardId) {
    const createdReward = await prisma.reward.create({
      data: {
        id: createId({ prefix: "rw_" }),
        programId,
        // connect the reward to the group
        salePartnerGroup: {
          connect: {
            id: groupId,
          },
        },
        event: EventType.sale,
        maxDuration: max_commission_period_months,
        type:
          reward_type === "amount"
            ? RewardStructure.flat
            : RewardStructure.percentage,
        amount:
          reward_type === "amount"
            ? commission_amount_cents
            : commission_percent,
      },
    });
    console.log(
      `Since group was newly created, also created reward ${createdReward.id} with amount ${createdReward.amount} and type ${createdReward.type}`,
    );
  }

  await prisma.program.update({
    where: {
      id: programId,
    },
    data: {
      minPayoutAmount: minimum_payout_cents,
      holdingPeriodDays: days_until_commissions_are_due,
    },
  });

  console.log(
    `Updated program ${programId} with min payout amount ${minimum_payout_cents} and holding period days ${days_until_commissions_are_due}`,
  );

  return await rewardfulImporter.queue({
    ...payload,
    ...(groupId && { groupId }),
    action: "import-partners",
  });
}
