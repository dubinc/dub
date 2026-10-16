import { prisma } from "@/lib/prisma";
import { toCentsNumber } from "@dub/utils";
import {
  PartnerLinksStats,
  partnerLinkStatsSelect,
} from "./aggregate-partner-links-stats";

// the link stats of a partner in each of their programs, or in one program, summed in
// the database instead of loading every link. Programs without links are not in the map
export async function getPartnerLinksStatsByProgram({
  partnerId,
  programId,
}: {
  partnerId: string;
  programId?: string;
}) {
  const stats = await prisma.link.groupBy({
    by: ["programId"],
    where: {
      partnerId,
      programId: programId ?? {
        not: null,
      },
    },
    _sum: partnerLinkStatsSelect,
  });

  return new Map<string, PartnerLinksStats>(
    stats.map(({ programId, _sum }) => [
      programId!,
      {
        totalClicks: _sum.clicks ?? 0,
        totalLeads: _sum.leads ?? 0,
        totalConversions: _sum.conversions ?? 0,
        totalSales: _sum.sales ?? 0,
        totalSaleAmount: toCentsNumber(_sum.saleAmount),
      },
    ]),
  );
}
