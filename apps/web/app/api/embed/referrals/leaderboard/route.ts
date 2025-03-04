import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { LeaderboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import z from "node_modules/zod/lib";

// GET /api/embed/referrals/leaderboard – get leaderboard for a program
export const GET = withReferralsEmbedToken(async ({ programId }) => {
  const partners = await prisma.$queryRaw`
    SELECT 
      p.id,
      p.name,
      pe.status, 
      pe.programId, 
      pe.partnerId, 
      pe.createdAt as enrollmentCreatedAt,
      COALESCE(SUM(l.clicks), 0) as totalClicks,
      COALESCE(SUM(l.leads), 0) as totalLeads,
      COALESCE(SUM(l.sales), 0) as totalSales,
      COALESCE(SUM(l.saleAmount), 0) as totalSaleAmount
    FROM 
      ProgramEnrollment pe 
    INNER JOIN 
      Partner p ON p.id = pe.partnerId AND p.showOnLeaderboard = true
    LEFT JOIN 
      Link l ON l.programId = pe.programId AND l.partnerId = pe.partnerId
    WHERE 
      pe.programId = ${programId}
    GROUP BY 
      p.id, pe.id
    ORDER BY 
      totalSaleAmount DESC,
      totalLeads DESC,
      totalClicks DESC
    LIMIT 20`;

  // @ts-ignore
  const response = partners.map((partner) => ({
    id: partner.id,
    name: partner.name,
    clicks: Number(partner.totalClicks),
    leads: Number(partner.totalLeads),
    sales: Number(partner.totalSales),
    saleAmount: Number(partner.totalSaleAmount),
  }));

  return NextResponse.json(z.array(LeaderboardPartnerSchema).parse(response));
});
