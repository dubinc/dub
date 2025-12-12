import { PartnerRewindProps } from "@/lib/types";
import { PartnerRewindSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";

const nonZeroFields = [
  "totalClicks",
  "totalLeads",
  "totalRevenue",
  "totalEarnings",
];

const CURRENT_YEAR = 2025;

export async function getPartnerRewind({
  partnerId,
}: {
  partnerId: string;
}): Promise<PartnerRewindProps | null> {
  const rewinds = await prisma.$queryRaw<
    {
      totalClicks: number;
      totalLeads: number;
      totalRevenue: number;
      totalEarnings: number;
      clicksPercentile: any; // Decimal
      leadsPercentile: any; // Decimal
      revenuePercentile: any; // Decimal
      earningsPercentile: any; // Decimal
    }[]
  >`
    SELECT
      pr.id,
      pr.year,
      pr.totalClicks,
      pr.totalLeads,
      pr.totalRevenue,
      pr.totalEarnings,
      CASE WHEN pr.totalClicks > 0 THEN ROUND(
        100 - 100 * (SELECT COUNT(*) FROM PartnerRewind c WHERE c.year = pr.year AND c.totalClicks >= pr.totalClicks)
            / (SELECT COUNT(*) FROM PartnerRewind WHERE year = pr.year)
      ) ELSE 0 END AS clicksPercentile,
      CASE WHEN pr.totalLeads > 0 THEN ROUND(
        100 - 100 * (SELECT COUNT(*) FROM PartnerRewind c WHERE c.year = pr.year AND c.totalLeads >= pr.totalLeads)
            / (SELECT COUNT(*) FROM PartnerRewind WHERE year = pr.year)
      ) ELSE 0 END AS leadsPercentile,
      CASE WHEN pr.totalRevenue > 0 THEN ROUND(
        100 - 100 * (SELECT COUNT(*) FROM PartnerRewind c WHERE c.year = pr.year AND c.totalRevenue >= pr.totalRevenue)
            / (SELECT COUNT(*) FROM PartnerRewind WHERE year = pr.year)
      ) ELSE 0 END AS revenuePercentile,
      CASE WHEN pr.totalEarnings > 0 THEN ROUND(
        100 - 100 * (SELECT COUNT(*) FROM PartnerRewind c WHERE c.year = pr.year AND c.totalEarnings >= pr.totalEarnings)
            / (SELECT COUNT(*) FROM PartnerRewind WHERE year = pr.year)
      ) ELSE 0 END AS earningsPercentile
    FROM PartnerRewind pr
    WHERE
      pr.partnerId = ${partnerId}
      AND pr.year = ${CURRENT_YEAR}`;

  if (!rewinds.length || nonZeroFields.every((field) => !rewinds[0][field]))
    return null;

  return PartnerRewindSchema.parse({
    ...rewinds[0],
    clicksPercentile: Number(rewinds[0].clicksPercentile),
    leadsPercentile: Number(rewinds[0].leadsPercentile),
    revenuePercentile: Number(rewinds[0].revenuePercentile),
    earningsPercentile: Number(rewinds[0].earningsPercentile),
  });
}
