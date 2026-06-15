import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { getSpendLimitWindow } from "@/lib/api/rewards/clamp-earnings-to-spend-limit";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { getTopLinksByCountries } from "@/lib/tinybird/get-top-links-by-countries";
import { COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import {
  CommissionType,
  Prisma,
  RewardSpendLimitInterval,
} from "@dub/prisma/client";
import {
  APP_DOMAIN_WITH_NGROK,
  currencyFormatter,
  getPrettyUrl,
  nFormatter,
} from "@dub/utils";
import { prettyPrint } from "@dub/utils/src";
import * as z from "zod/v4";
import { logAndRespond } from "../utils";
import { resolveClickReward } from "./resolve-click-reward-amount";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 200;

const schema = z.object({
  startingAfter: z.string().optional(),
  batchNumber: z.number().optional().default(1),
});

type LinkEarnings = {
  clicks: number;
  earnings: number;
  programId: string;
  partnerId: string;
  spendLimitAmount: number | null;
  spendLimitInterval: RewardSpendLimitInterval | null;
};

// This route is used aggregate clicks events on daily basis for Program links and add to the Commission table
// Runs every day at 00:00 (0 0 * * *)
// GET /api/cron/aggregate-clicks
async function handler(req: Request) {
  try {
    let { startingAfter, batchNumber } = schema.parse({
      startingAfter: undefined,
      batchNumber: 1,
    });

    if (req.method === "GET") {
      await verifyVercelSignature(req);
    } else if (req.method === "POST") {
      const rawBody = await req.text();
      await verifyQstashSignature({
        req,
        rawBody,
      });

      ({ startingAfter, batchNumber } = schema.parse(JSON.parse(rawBody)));
    }

    const now = new Date();

    // set 'start' to the beginning of the previous day (00:00:00)
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    // set 'end' to the end of the previous day (23:59:59)
    const end = new Date(now);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);

    const linksWithClickRewards = await prisma.link.findMany({
      where: {
        programEnrollment: {
          status: {
            in: COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES,
          },
          clickRewardId: {
            not: null,
          },
        },
        clicks: {
          gt: 0,
        },
        lastClicked: {
          gte: start, // links that were clicked on after the start date
        },
      },
      select: {
        id: true,
        shortLink: true,
        programId: true,
        partnerId: true,
        programEnrollment: {
          select: {
            clickReward: true,
          },
        },
      },
      take: BATCH_SIZE,
      skip: startingAfter ? 1 : 0,
      ...(startingAfter && {
        cursor: {
          id: startingAfter,
        },
      }),
      orderBy: {
        id: "asc",
      },
    });

    const endMessage = `Finished aggregating clicks for ${batchNumber} batches (total ${nFormatter(batchNumber * (BATCH_SIZE - 1) + linksWithClickRewards.length, { full: true })} links)`;

    if (linksWithClickRewards.length === 0) {
      return logAndRespond(endMessage);
    }

    const clicksByCountries = await getTopLinksByCountries({
      linkIds: linksWithClickRewards.map(({ id }) => id),
      start,
      end,
    });

    console.log(clicksByCountries);

    // This should never happen, but just in case
    if (clicksByCountries.length === 0) {
      return logAndRespond(endMessage);
    }

    // Group clicks by link_id for easier iteration
    const clicksByLinkId = new Map<string, typeof clicksByCountries>();
    for (const click of clicksByCountries) {
      const existing = clicksByLinkId.get(click.link_id) || [];
      existing.push(click);
      clicksByLinkId.set(click.link_id, existing);
    }

    const linkEarningsMap = new Map<string, LinkEarnings>();

    // Calculate earnings per link considering geo CPC
    for (const {
      id: linkId,
      shortLink,
      programId,
      partnerId,
      programEnrollment,
    } of linksWithClickRewards) {
      if (!programEnrollment?.clickReward || !programId || !partnerId) {
        console.log(`No click reward for link ${linkId}.`);
        continue;
      }

      const linkClicksByCountry = clicksByLinkId.get(linkId) || [];

      // Calculate earnings per country for each link
      for (const { country, clicks } of linkClicksByCountry) {
        const reward = resolveClickReward({
          reward: programEnrollment.clickReward,
          country,
        });

        const existing = linkEarningsMap.get(linkId) || {
          clicks: 0,
          earnings: 0,
        };

        const amountInCents = getRewardAmount(serializeReward(reward));

        linkEarningsMap.set(linkId, {
          clicks: existing.clicks + clicks,
          earnings: existing.earnings + amountInCents * clicks,
          programId,
          partnerId,
          spendLimitAmount: reward.spendLimitAmount,
          spendLimitInterval: reward.spendLimitInterval,
        });

        // only console.log if there are modifiers
        if (programEnrollment.clickReward.modifiers) {
          console.log(
            `Earnings for link ${getPrettyUrl(shortLink)} for ${country}: ${currencyFormatter(amountInCents)} * ${clicks} = ${currencyFormatter(
              amountInCents * clicks,
            )}`,
          );
        }
      }
    }

    const historicalEarningsMap = await getHistoricalEarnings(linkEarningsMap);

    // Earnings already allocated in this batch, so multiple links for the same
    // (program, partner, interval) tuple share the spend-limit budget.
    const usedSpendLimitMap = new Map<string, number>();

    // Create commissions for each link
    const commissionsToCreate = linksWithClickRewards
      .map(({ id, programId, partnerId, programEnrollment }) => {
        if (!programId || !partnerId || !programEnrollment?.clickReward) {
          return null;
        }

        const linkEarnings = linkEarningsMap.get(id);

        if (!linkEarnings) {
          return null;
        }

        let { clicks, earnings, spendLimitAmount, spendLimitInterval } =
          linkEarnings;

        if (clicks === 0 || earnings === 0) {
          return null;
        }

        // Cap earnings to spend limit
        if (spendLimitAmount != null && spendLimitInterval != null) {
          const earningsForInterval =
            historicalEarningsMap.get(spendLimitInterval);

          const programEnrollment = earningsForInterval?.find(
            (earning) =>
              earning.programId === programId &&
              earning.partnerId === partnerId,
          );

          if (programEnrollment) {
            const key = `${programId}-${partnerId}`;

            const historicalEarnings =
              programEnrollment.historicalEarnings ?? 0;
            const usedThisBatch = usedSpendLimitMap.get(key) ?? 0;
            const remainingSpendLimit =
              spendLimitAmount - historicalEarnings - usedThisBatch;

            earnings = Math.max(0, Math.min(earnings, remainingSpendLimit));

            if (earnings === 0) {
              return null;
            }

            usedSpendLimitMap.set(key, usedThisBatch + earnings);
          }
        }

        return {
          id: createId({ prefix: "cm_" }),
          programId,
          partnerId,
          rewardId: programEnrollment.clickReward.id,
          linkId: id,
          quantity: clicks,
          type: CommissionType.click,
          amount: 0,
          earnings,
        };
      })
      .filter(
        (c): c is NonNullable<typeof c> => c !== null,
      ) satisfies Prisma.CommissionCreateManyInput[];

    console.table(commissionsToCreate);

    // Create commissions
    await prisma.commission.createMany({
      data: commissionsToCreate,
    });

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

    // Schedule next batch if we have more links to process
    if (linksWithClickRewards.length === BATCH_SIZE) {
      const nextStartingAfter =
        linksWithClickRewards[linksWithClickRewards.length - 1].id;

      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/aggregate-clicks`,
        method: "POST",
        body: {
          startingAfter: nextStartingAfter,
          batchNumber: batchNumber + 1,
        },
      });

      return logAndRespond(
        `Enqueued next batch (batch #${batchNumber + 1} for aggregate clicks cron (startingAfter: ${nextStartingAfter}).`,
      );
    }

    return logAndRespond(endMessage);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

async function getHistoricalEarnings(
  linkEarningsMap: Map<string, LinkEarnings>,
) {
  // Group historical earnings by spendLimitInterval
  const historicalEarningsMap = new Map<
    RewardSpendLimitInterval,
    Array<{
      programId: string;
      partnerId: string;
      spendLimitAmount: number;
      spendLimitInterval: RewardSpendLimitInterval;
      historicalEarnings: number;
    }>
  >();

  for (const {
    programId,
    partnerId,
    spendLimitAmount,
    spendLimitInterval,
  } of linkEarningsMap.values()) {
    if (spendLimitAmount == null || spendLimitInterval == null) {
      continue;
    }

    const entries = historicalEarningsMap.get(spendLimitInterval) ?? [];

    entries.push({
      programId,
      partnerId,
      spendLimitInterval,
      spendLimitAmount,
      historicalEarnings: 0, // will be updated below
    });

    historicalEarningsMap.set(spendLimitInterval, entries);
  }

  // Fetch historical earnings per spendLimitInterval
  for (const [spendLimitInterval, entries] of historicalEarningsMap.entries()) {
    const { startDate, endDate } = getSpendLimitWindow(spendLimitInterval);

    const commissions = await prisma.commission.groupBy({
      by: ["programId", "partnerId"],
      where: {
        programId: { in: entries.map((e) => e.programId) },
        partnerId: { in: entries.map((e) => e.partnerId) },
        type: CommissionType.click,
        status: { in: ["pending", "processed", "paid"] },
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

    const updatedEntries = entries.map((entry) => {
      const match = commissions.find(
        (c) =>
          c.programId === entry.programId && c.partnerId === entry.partnerId,
      );

      return {
        ...entry,
        historicalEarnings: match?._sum.earnings ?? entry.historicalEarnings,
      };
    });

    historicalEarningsMap.set(spendLimitInterval, updatedEntries);
  }

  console.log(prettyPrint(historicalEarningsMap));

  return historicalEarningsMap;
}

export { handler as GET, handler as POST };
