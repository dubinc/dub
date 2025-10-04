import { campaignSummarySchema } from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";

interface QueryResult {
  sent: number;
  delivered: number;
  opened: number;
  bounced: number;
}

export const getCampaignSummary = async (campaignId: string) => {
  const [queryResult] = await prisma.$queryRaw<QueryResult[]>`
    SELECT
      COUNT(*) AS sent,
      SUM(CASE WHEN deliveredAt IS NOT NULL THEN 1 ELSE 0 END) AS delivered,
      SUM(CASE WHEN openedAt IS NOT NULL THEN 1 ELSE 0 END) AS opened,
      SUM(CASE WHEN bouncedAt IS NOT NULL THEN 1 ELSE 0 END) AS bounced
    FROM NotificationEmail
    WHERE campaignId = ${campaignId}
  `;

  const sent = Number(queryResult.sent);
  const deliveredPercentage =
    sent > 0 ? (Number(queryResult.delivered) / sent) * 100 : 0;
  const openedPercentage =
    sent > 0 ? (Number(queryResult.opened) / sent) * 100 : 0;
  const bouncedPercentage =
    sent > 0 ? (Number(queryResult.bounced) / sent) * 100 : 0;

  return campaignSummarySchema.parse({
    sent: {
      count: queryResult.sent,
      percent: deliveredPercentage,
    },
    delivered: {
      count: queryResult.delivered,
      percent: deliveredPercentage,
    },
    opened: {
      count: queryResult.opened,
      percent: openedPercentage,
    },
    bounced: {
      count: queryResult.bounced,
      percent: bouncedPercentage,
    },
  });
};
