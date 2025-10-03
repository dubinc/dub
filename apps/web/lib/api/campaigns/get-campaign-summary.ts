import { prisma } from "@dub/prisma";
import { z } from "zod";

const schema = z.object({
  sent: z.coerce.number(),
  delivered: z.coerce.number(),
  opened: z.coerce.number(),
  bounced: z.coerce.number(),
});

export const getCampaignSummary = async (campaignId: string) => {
  const [queryResult] = await prisma.$queryRaw<z.infer<typeof schema>[]>`
    SELECT
      COUNT(*) AS sent,
      SUM(CASE WHEN deliveredAt IS NOT NULL THEN 1 ELSE 0 END) AS delivered,
      SUM(CASE WHEN openedAt IS NOT NULL THEN 1 ELSE 0 END) AS opened,
      SUM(CASE WHEN bouncedAt IS NOT NULL THEN 1 ELSE 0 END) AS bounced
    FROM NotificationEmail
    WHERE campaignId = ${campaignId}
  `;

  return schema.parse(queryResult);
};
