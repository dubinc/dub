import { RESOURCE_COLORS } from "@/ui/colors";
import { prisma } from "@dub/prisma";
import { EventType, RewardStructure } from "@dub/prisma/client";
import { randomValue } from "@dub/utils";
import { createId } from "../api/create-id";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";
import { RewardfulApi } from "./api";
import { rewardfulImporter } from "./importer";
import { RewardfulImportPayload } from "./types";

export async function importCampaign(payload: RewardfulImportPayload) {
  const { programId, campaignId } = payload;

  const { workspaceId, groups } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      groups: {
        where: {
          slug: DEFAULT_PARTNER_GROUP.slug,
        },
      },
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

  const rewardProps = {
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

  let groupId: string | null = null;

  const existingReward = await prisma.reward.findFirst({
    where: { ...rewardProps, event: EventType.sale },
    include: {
      salePartnerGroup: true, // rewardful only supports sale rewards
    },
  });

  if (!existingReward) {
    // if no existing reward, create a new one + group
    const createdReward = await prisma.reward.create({
      data: {
        ...rewardProps,
        id: createId({ prefix: "rw_" }),
      },
    });

    // if the default group has an associated sale reward already, we need to create a new group
    if (groups.length > 0 && groups[0].saleRewardId) {
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
          saleRewardId: createdReward.id,
        },
      });
      groupId = createdGroup.id;

      // else we just update the existing group with the newly created sale reward
    } else {
      const updatedGroup = await prisma.partnerGroup.update({
        where: {
          id: groups[0].id,
        },
        data: {
          saleRewardId: createdReward.id,
        },
      });
      groupId = updatedGroup.id;
    }
  } else {
    groupId = existingReward.salePartnerGroup?.id!;
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

  return await rewardfulImporter.queue({
    ...payload,
    ...(groupId && { groupId }),
    action: "import-partners",
  });
}
