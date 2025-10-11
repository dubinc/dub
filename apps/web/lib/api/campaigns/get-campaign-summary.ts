import { CampaignSummary } from "@/lib/types";
import { campaignSummarySchema } from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";

export const getCampaignSummary = async (campaignId: string) => {
  const [queryResult] = await prisma.$queryRaw<CampaignSummary[]>`
    SELECT
      COUNT(*) AS sent,
      SUM(CASE WHEN deliveredAt IS NOT NULL THEN 1 ELSE 0 END) AS delivered,
      SUM(CASE WHEN openedAt IS NOT NULL THEN 1 ELSE 0 END) AS opened,
      SUM(CASE WHEN bouncedAt IS NOT NULL THEN 1 ELSE 0 END) AS bounced
    FROM NotificationEmail
    WHERE campaignId = ${campaignId}
  `;

  return campaignSummarySchema.parse({
    sent: queryResult.sent,
    delivered: queryResult.delivered,
    opened: queryResult.opened,
    bounced: queryResult.bounced,
  });
};
