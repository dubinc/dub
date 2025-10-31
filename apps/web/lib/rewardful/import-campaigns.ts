import { RESOURCE_COLORS } from "@/ui/colors";
import { prisma } from "@dub/prisma";
import { EventType, Prisma, RewardStructure } from "@dub/prisma/client";
import { randomValue } from "@dub/utils";
import { differenceInSeconds } from "date-fns";
import { createId } from "../api/create-id";

import { serializeReward } from "../api/partners/serialize-reward";
import { getRewardAmount } from "../partners/get-reward-amount";
import { RewardfulApi } from "./api";
import { rewardfulImporter } from "./importer";
import { RewardfulImportPayload } from "./types";

export async function importCampaigns(payload: RewardfulImportPayload) {
  const { programId, campaignIds } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    select: {
      workspaceId: true,
      domain: true,
      url: true,
    },
  });

  if (!program.domain || !program.url) {
    throw new Error("Program domain or URL is not set.");
  }

  const { token } = await rewardfulImporter.getCredentials(program.workspaceId);

  const rewardfulApi = new RewardfulApi({ token });

  const campaigns = await rewardfulApi.listCampaigns();
  const campaignsToImport = campaigns.filter((campaign) =>
    campaignIds.includes(campaign.id),
  );

  for (const campaign of campaignsToImport) {
    const {
      id: campaignId,
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
      create: {
        id: createId({ prefix: "grp_" }),
        programId,
        name: `(Rewardful) ${campaign.name}`,
        slug: groupSlug,
        color: randomValue(RESOURCE_COLORS),
        partnerGroupDefaultLinks: {
          create: {
            id: createId({ prefix: "pgdl_" }),
            programId,
            domain: program.domain,
            url: program.url,
          },
        },
      },
      update: {},
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

    if (!createdGroup.saleRewardId) {
      const createdReward = await prisma.reward.create({
        data: {
          id: createId({ prefix: "rw_" }),
          programId,
          // connect the reward to the group
          salePartnerGroup: {
            connect: {
              id: createdGroup.id,
            },
          },
          event: EventType.sale,
          maxDuration: max_commission_period_months,
          type:
            reward_type === "amount"
              ? RewardStructure.flat
              : RewardStructure.percentage,
          ...(reward_type === "amount"
            ? {
                amountInCents: commission_amount_cents,
              }
            : {
                amountInPercentage: new Prisma.Decimal(commission_percent),
              }),
        },
      });

      console.log(
        `Since group was newly created, also created reward ${createdReward.id} with amount ${getRewardAmount(serializeReward(createdReward))} and type ${createdReward.type}`,
      );
    }

    if (campaign.default) {
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
    }
  }

  return await rewardfulImporter.queue({
    ...payload,
    action: "import-partners",
  });
}
