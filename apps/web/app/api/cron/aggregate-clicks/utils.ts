import { getAnalytics } from "@/lib/analytics/get-analytics";
import { qstash } from "@/lib/cron";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

interface Options {
  cursor?: string;
}

const batchSize = 100;

export const updateAggregateClicks = async ({ cursor }: Options = {}) => {
  const now = new Date();

  // define the 24h window for "yesterday"
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);

  const rewards = await prisma.reward.findMany({
    where: {
      event: "click",
    },
    // click rewards are always partner-specific for now
    // but in the future we need to account for program-wide click rewards
    include: {
      partners: {
        select: {
          programEnrollment: {
            select: {
              partnerId: true,
            },
          },
        },
      },
    },
  });

  if (!rewards.length) {
    console.log("No programs with click rewards found. Skipping...");
    return;
  }

  // build OR-filters by programId & partnerId
  const filters = rewards.flatMap((r) => {
    const partnerIds = r.partners.map((p) => p.programEnrollment.partnerId);
    return partnerIds.length
      ? { programId: r.programId, partnerId: { in: partnerIds } }
      : [];
  });

  // page through links matching click rewards
  const links = await prisma.link.findMany({
    where: {
      clicks: { gt: 0 },
      lastClicked: { gte: start },
      OR: filters,
    },
    select: { id: true, programId: true, partnerId: true },
    orderBy: { id: "asc" },
    take: batchSize,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  if (links.length === 0) {
    console.log("All link click aggregations complete.");
    return;
  }

  for (const { id: linkId, programId, partnerId } of links) {
    if (!programId || !partnerId) {
      console.warn("Invalid link", { linkId, programId, partnerId });
      continue;
    }
    const { clicks: quantity } = await getAnalytics({
      linkId,
      start,
      end,
      groupBy: "count",
      event: "clicks",
    });
    if (!quantity || quantity === 0) {
      console.log("No clicks found for link", {
        linkId,
        programId,
        partnerId,
      });
      continue;
    }

    // pick the matching reward
    const reward = rewards.find((r) => r.programId === programId);
    if (!reward) {
      console.warn("No matching reward found for link", {
        linkId,
        programId,
        partnerId,
      });
      continue;
    }

    console.log("Creating commission", {
      reward,
      event: "click",
      programId,
      partnerId,
      linkId,
      quantity,
    });
    await createPartnerCommission({
      reward,
      event: "click",
      programId,
      partnerId,
      linkId,
      quantity,
    });
  }

  // schedule the next page
  const lastLinkId = links[links.length - 1].id;
  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/aggregate-clicks`,
    method: "POST",
    body: { cursor: lastLinkId },
  });
};
