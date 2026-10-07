import { createId } from "@/lib/api/create-id";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { getRewardSpendLimitWindow } from "@/lib/api/rewards/reward-spend-limit-window";
import { buildCommissionDescription } from "@/lib/commissions/build-commission-description";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { prisma } from "@/lib/prisma";
import { resolveClickReward } from "@/lib/rewards/resolve-click-reward";
import { getTopLinksByCountries } from "@/lib/tinybird/get-top-links-by-countries";
import { COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { pluck } from "@dub/utils";
import {
  CommissionStatus,
  CommissionType,
  Prisma,
  ProgramEnrollment,
  Reward,
} from "@prisma/client";

type LinkEarnings = {
  clicks: number;
  earnings: number;
  reward: Reward;
};

type ProcessClickAggregationInput = {
  programId: string;
  partnerId: string;
  startDate: Date;
  endDate: Date;
};

export async function processClickAggregation({
  programId,
  partnerId,
  startDate,
  endDate,
}: ProcessClickAggregationInput) {
  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    select: {
      id: true,
      status: true,
      programId: true,
      partnerId: true,
      clickReward: true,
    },
  });

  if (!programEnrollment) {
    console.log(
      `Enrollment not found for partner ${partnerId} and program ${programId}`,
    );
    return;
  }

  if (
    !COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES.includes(programEnrollment.status)
  ) {
    console.log(
      `Enrollment not commission eligible for partner ${partnerId} and program ${programId}`,
    );
    return;
  }

  const linkEarningsMap = await calculateEarningsByLink({
    startDate,
    endDate,
    programEnrollment,
  });

  if (!linkEarningsMap) {
    return;
  }

  await createClickCommissions({
    startDate,
    endDate,
    programEnrollment,
    linkEarningsMap,
  });
}

// Calculate how much was earned by each link for a program enrollment between two dates
async function calculateEarningsByLink({
  startDate,
  endDate,
  programEnrollment,
}: Pick<ProcessClickAggregationInput, "startDate" | "endDate"> & {
  programEnrollment: Pick<ProgramEnrollment, "programId" | "partnerId"> & {
    clickReward: Reward | null;
  };
}) {
  const { programId, partnerId } = programEnrollment;

  const links = await prisma.link.findMany({
    where: {
      programId,
      partnerId,
      // links that were clicked on after the start date
      lastClicked: {
        gte: startDate,
      },
      clicks: {
        gt: 0,
      },
    },
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
      shortLink: true,
      linkReward: {
        select: {
          clickReward: true,
        },
      },
    },
  });

  if (links.length === 0) {
    console.log(
      `No links found for partner ${partnerId} and program ${programId} with clicks after ${startDate}.`,
    );
    return;
  }

  const clicksByCountries = await getTopLinksByCountries({
    linkIds: pluck(links, "id"),
    start: startDate,
    end: endDate,
  });

  // Group clicks by link
  const clicksByLinkId = new Map<string, typeof clicksByCountries>();

  for (const click of clicksByCountries) {
    const existing = clicksByLinkId.get(click.link_id) || [];
    existing.push(click);
    clicksByLinkId.set(click.link_id, existing);
  }

  // Calculate earnings per link considering geo CPC
  const linkEarningsMap = new Map<string, LinkEarnings>();

  for (const link of links) {
    const clickReward =
      link.linkReward?.clickReward ?? programEnrollment.clickReward;

    // Skip soft deleted click rewards
    if (clickReward?.programId === null || clickReward?.groupId === null) {
      console.log(
        `Click reward ${clickReward.id} for link ${link.id} is soft deleted (programId=${clickReward.programId}, groupId=${clickReward.groupId}). Skipping...`,
      );
      continue;
    }

    if (!clickReward) {
      console.log(`No click reward for link ${link.id}. Skipping...`);
      continue;
    }

    const linkClicksByCountry = clicksByLinkId.get(link.id) || [];

    if (linkClicksByCountry.length === 0) {
      console.log(
        `No clicks in aggregation window for link ${link.id}. Skipping...`,
      );
      continue;
    }

    // Calculate earnings per country for each link
    for (const { country, clicks } of linkClicksByCountry) {
      const finalReward = resolveClickReward({
        reward: clickReward,
        country,
      });

      const existing = linkEarningsMap.get(link.id) || {
        clicks: 0,
        earnings: 0,
        reward: clickReward,
      };

      const amountInCents = getRewardAmount(serializeReward(finalReward));

      linkEarningsMap.set(link.id, {
        clicks: existing.clicks + clicks,
        earnings: existing.earnings + amountInCents * clicks,
        reward: clickReward,
      });
    }
  }

  return linkEarningsMap;
}

async function getHistoricalClicksEarnings({
  startDate: aggregationStartDate,
  programEnrollment,
  reward,
}: {
  programEnrollment: Pick<ProgramEnrollment, "programId" | "partnerId">;
  startDate: Date;
  reward: Pick<Reward, "id" | "spendLimitInterval">;
}) {
  if (!reward.spendLimitInterval) {
    return 0;
  }

  const { startDate, endDate } = getRewardSpendLimitWindow({
    spendLimitInterval: reward.spendLimitInterval,
    referenceDate: aggregationStartDate,
  });

  const {
    _sum: { earnings },
  } = await prisma.commission.aggregate({
    where: {
      programId: programEnrollment.programId,
      partnerId: programEnrollment.partnerId,
      rewardId: reward.id,
      type: CommissionType.click,
      status: {
        in: [
          CommissionStatus.pending,
          CommissionStatus.processed,
          CommissionStatus.paid,
        ],
      },
      ...(startDate && endDate
        ? {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }
        : {}),
    },
    _sum: {
      earnings: true,
    },
  });

  return earnings ?? 0;
}

async function createClickCommissions({
  startDate,
  endDate,
  programEnrollment,
  linkEarningsMap,
}: Pick<ProcessClickAggregationInput, "startDate" | "endDate"> & {
  programEnrollment: Pick<ProgramEnrollment, "programId" | "partnerId">;
  linkEarningsMap: Map<string, LinkEarnings>;
}) {
  const { programId, partnerId } = programEnrollment;

  if (linkEarningsMap.size === 0) {
    console.log(
      `No link earnings to commission for partner ${partnerId} in program ${programId}. Skipping...`,
    );
    return;
  }

  const aggregationDate = startDate.toISOString().split("T")[0];
  const usedSpendLimitByReward = new Map<string, number>();
  const historicalEarningsByReward = new Map<string, number>();
  const rewardsWithSpendLimit = new Map<string, Reward>();

  for (const { reward } of linkEarningsMap.values()) {
    if (reward.spendLimitAmount && reward.spendLimitInterval) {
      rewardsWithSpendLimit.set(reward.id, reward);
    }
  }

  await Promise.all(
    Array.from(rewardsWithSpendLimit.values()).map(async (reward) => {
      const historicalEarnings = await getHistoricalClicksEarnings({
        programEnrollment,
        startDate,
        reward,
      });

      historicalEarningsByReward.set(reward.id, historicalEarnings);
    }),
  );

  const commissionsToCreate: Prisma.CommissionCreateManyInput[] = [];

  // Create commissions for each link
  for (const [linkId, { clicks, earnings, reward }] of linkEarningsMap) {
    if (clicks === 0 || earnings === 0) {
      console.log(
        `No click earnings for link ${linkId} (clicks=${clicks}, earnings=${earnings}). Skipping...`,
      );
      continue;
    }

    let cappedEarnings = earnings;

    // Cap earnings to spend limit
    if (reward.spendLimitAmount && reward.spendLimitInterval) {
      const usedThisBatch = usedSpendLimitByReward.get(reward.id) ?? 0;
      const historicalEarnings = historicalEarningsByReward.get(reward.id) ?? 0;

      const remainingSpendLimit =
        reward.spendLimitAmount - historicalEarnings - usedThisBatch;

      cappedEarnings = Math.max(0, Math.min(earnings, remainingSpendLimit));

      if (cappedEarnings === 0) {
        console.log(
          `Reached spend limit for partner ${partnerId} on link ${linkId} (reward ${reward.id}). Skipping...`,
        );
        continue;
      }

      usedSpendLimitByReward.set(reward.id, usedThisBatch + cappedEarnings);
    }

    // Persist the base click reward description (no per-country clause —
    // one commission can mix countries/rates).
    const description = buildCommissionDescription({
      reward: serializeReward(reward),
      earnings,
      cappedEarnings,
    });

    commissionsToCreate.push({
      id: createId({ prefix: "cm_" }),
      programId,
      partnerId,
      rewardId: reward.id,
      linkId,
      quantity: clicks,
      type: CommissionType.click,
      amount: 0,
      earnings: cappedEarnings,
      description,
      createdAt: endDate,
      invoiceId: `${linkId}-${aggregationDate}`, // used as a idempotency key
    });
  }

  if (commissionsToCreate.length === 0) {
    console.log(
      `No click commissions to create for partner ${partnerId} in program ${programId}. Skipping...`,
    );
    return;
  }

  const { count } = await prisma.commission.createMany({
    data: commissionsToCreate,
    skipDuplicates: true,
  });

  console.log(
    `Created ${count} click commissions for partner ${partnerId} in program ${programId}.`,
  );

  if (count > 0) {
    await syncTotalCommissions({
      partnerId,
      programId,
    });
  }
}
