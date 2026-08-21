import { createId } from "@/lib/api/create-id";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { getRewardSpendLimitWindow } from "@/lib/api/rewards/reward-spend-limit-window";
import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { prisma } from "@/lib/prisma";
import { getTopLinksByCountries } from "@/lib/tinybird/get-top-links-by-countries";
import { COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { buildCommissionDescription } from "@/ui/partners/program-reward-spend-limit";
import {
  APP_DOMAIN_WITH_NGROK,
  currencyFormatter,
  getPrettyUrl,
} from "@dub/utils";
import { CommissionType, EventType, Prisma, Reward } from "@prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";
import { resolveClickReward } from "../resolve-click-reward-amount";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  clickRewardId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  startingAfter: z.string().optional(),
});

const BATCH_SIZE = 200;

type LinkEarnings = {
  clicks: number;
  earnings: number;
  partnerId: string;
};

// POST /api/cron/aggregate-clicks/process
// Process a batch of links for a given click reward
export const POST = withCron(async ({ rawBody }) => {
  const { clickRewardId, startDate, endDate, startingAfter } =
    inputSchema.parse(JSON.parse(rawBody));

  const clickReward = await prisma.reward.findUnique({
    where: {
      id: clickRewardId,
    },
  });

  if (!clickReward) {
    return logAndRespond(`Reward not found for ${clickRewardId}. Skipping...`);
  }

  // When soft deleted
  if (!clickReward.programId) {
    return logAndRespond(
      `Reward ${clickRewardId} is not associated with a program. Skipping...`,
    );
  }

  if (clickReward.event !== EventType.click) {
    return logAndRespond(
      `Reward ${clickRewardId} is not a click reward. Skipping...`,
    );
  }

  const links = await prisma.link.findMany({
    where: {
      programEnrollment: {
        status: {
          in: COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES,
        },
        clickRewardId,
      },
      clicks: {
        gt: 0,
      },
      lastClicked: {
        gte: startDate, // links that were clicked on after the start date
      },
    },
    select: {
      id: true,
      shortLink: true,
      programId: true,
      partnerId: true,
    },
    ...(startingAfter && {
      skip: 1,
      cursor: {
        id: startingAfter,
      },
    }),
    orderBy: {
      id: "asc",
    },
    take: BATCH_SIZE,
  });

  if (links.length === 0) {
    return logAndRespond(
      `No more links found for ${clickRewardId}. Skipping...`,
    );
  }

  const clicksByCountries = await getTopLinksByCountries({
    linkIds: links.map(({ id }) => id),
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

  for (const { id: linkId, shortLink, programId, partnerId } of links) {
    if (!programId || !partnerId) {
      console.log(`No click reward for link ${linkId}.`);
      continue;
    }

    const linkClicksByCountry = clicksByLinkId.get(linkId) || [];

    // Calculate earnings per country for each link
    for (const { country, clicks } of linkClicksByCountry) {
      const finalReward = resolveClickReward({
        reward: clickReward,
        country,
      });

      const existing = linkEarningsMap.get(linkId) || {
        clicks: 0,
        earnings: 0,
      };

      const amountInCents = getRewardAmount(serializeReward(finalReward));

      linkEarningsMap.set(linkId, {
        clicks: existing.clicks + clicks,
        earnings: existing.earnings + amountInCents * clicks,
        partnerId,
      });

      if (clickReward.modifiers) {
        console.log(
          `Earnings for link ${getPrettyUrl(shortLink)} for ${country}: ${currencyFormatter(amountInCents)} * ${clicks} = ${currencyFormatter(
            amountInCents * clicks,
          )}`,
        );
      }
    }
  }

  // Apply reward spend limit
  const uniquePartners = new Set(
    Array.from(linkEarningsMap.values(), ({ partnerId }) => partnerId),
  );

  const historicalEarningsByPartner = await getHistoricalEarnings({
    clickReward,
    partnerIds: Array.from(uniquePartners),
    aggregationStartDate: startDate,
  });

  const aggregationDate = startDate.toISOString().split("T")[0];
  const usedSpendLimitByPartner = new Map<string, number>();
  let commissionsToCreate: Prisma.CommissionCreateManyInput[] = [];

  // Create commissions for each link
  commissionsToCreate = links
    .map(({ id: linkId, programId, partnerId }) => {
      if (!programId || !partnerId) {
        return null;
      }

      const linkEarnings = linkEarningsMap.get(linkId);

      if (!linkEarnings) {
        return null;
      }

      let { clicks, earnings } = linkEarnings;

      if (clicks === 0 || earnings === 0) {
        return null;
      }

      let description: string | null = null;

      // Cap earnings to spend limit
      if (clickReward.spendLimitAmount && clickReward.spendLimitInterval) {
        const usedThisBatch = usedSpendLimitByPartner.get(partnerId) ?? 0;
        const historicalEarnings =
          historicalEarningsByPartner.get(partnerId) ?? 0;

        const remainingSpendLimit =
          clickReward.spendLimitAmount - historicalEarnings - usedThisBatch;

        const cappedEarnings = Math.max(
          0,
          Math.min(earnings, remainingSpendLimit),
        );

        if (cappedEarnings === 0) {
          console.log(`Reached spend limit for partner ${partnerId}.`);
          return null;
        }

        usedSpendLimitByPartner.set(partnerId, usedThisBatch + cappedEarnings);

        description = buildCommissionDescription({
          earnings,
          cappedEarnings,
          reward: serializeReward(clickReward),
        });

        earnings = cappedEarnings;
      }

      return {
        id: createId({ prefix: "cm_" }),
        programId,
        partnerId,
        rewardId: clickReward.id,
        linkId,
        quantity: clicks,
        type: CommissionType.click,
        amount: 0,
        earnings,
        description,
        createdAt: endDate,
        invoiceId: `${linkId}-${aggregationDate}`, // used as a idempotency key
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const { count } = await prisma.commission.createMany({
    data: commissionsToCreate,
    skipDuplicates: true,
  });

  console.log(
    `Created ${count} commissions for click reward ${clickRewardId}.`,
  );

  if (count > 0) {
    console.table(commissionsToCreate);

    // Sync total commissions for each partner that we created commissions for
    for (const { partnerId, programId } of commissionsToCreate) {
      await syncTotalCommissions({
        partnerId,
        programId,
      });
    }

    console.log(
      `Synced total commissions count for ${commissionsToCreate.length} partners`,
    );
  }

  // Schedule next batch if we have more links to process
  if (links.length === BATCH_SIZE) {
    const nextStartingAfter = links[links.length - 1].id;

    await enqueueBatchJobs([
      {
        queueName: "aggregate-clicks",
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/aggregate-clicks/process`,
        body: {
          clickRewardId: clickReward.id,
          startDate,
          endDate,
          startingAfter: nextStartingAfter,
        },
      },
    ]);

    return logAndRespond(
      `Enqueued next batch for aggregate clicks cron (startingAfter: ${nextStartingAfter}).`,
    );
  }

  return logAndRespond("Aggregate clicks job processed successfully.");
});

async function getHistoricalEarnings({
  clickReward,
  partnerIds,
  aggregationStartDate,
}: {
  clickReward: Pick<
    Reward,
    "spendLimitAmount" | "spendLimitInterval" | "programId"
  >;
  partnerIds: string[];
  aggregationStartDate: Date;
}) {
  if (
    !clickReward.spendLimitAmount ||
    !clickReward.spendLimitInterval ||
    !clickReward.programId
  ) {
    return new Map<string, number>();
  }

  const { startDate, endDate } = getRewardSpendLimitWindow({
    spendLimitInterval: clickReward.spendLimitInterval,
    referenceDate: aggregationStartDate,
  });

  const commissions = await prisma.commission.groupBy({
    by: ["programId", "partnerId"],
    where: {
      programId: clickReward.programId,
      partnerId: {
        in: partnerIds,
      },
      type: CommissionType.click,
      status: {
        in: ["pending", "processed", "paid"],
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

  const historicalEarningsByPartner = new Map<string, number>();

  for (const commission of commissions) {
    historicalEarningsByPartner.set(
      commission.partnerId,
      commission._sum.earnings ?? 0,
    );
  }

  return historicalEarningsByPartner;
}
