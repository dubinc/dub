import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { omitSaleAmount } from "@/lib/partners/hide-partner-revenue";
import { isPartnerRevenueHidden } from "@/lib/partners/is-partner-revenue-hidden";
import { partnerProfileAnalyticsQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { parseFilterValue } from "@dub/utils";
import { NextResponse } from "next/server";

const querySchema = partnerProfileAnalyticsQuerySchema.pick({
  event: true,
  start: true,
  end: true,
  groupBy: true,
  saleType: true,
  interval: true,
});

// GET /api/embed/referrals/analytics – get analytics for a partner
export const GET = withReferralsEmbedToken(
  async ({ links, program, group, searchParams }) => {
    if (links.length === 0) {
      return NextResponse.json([]);
    }

    const parsedQuery = querySchema.parse(searchParams);

    const analytics = await getAnalytics({
      ...parsedQuery,
      workspaceId: program.workspaceId,
      linkId: parseFilterValue(links.map((link) => link.id)),
      dataAvailableFrom: program.startedAt ?? program.createdAt,
    });

    if (!isPartnerRevenueHidden(group)) {
      return NextResponse.json(analytics);
    }

    if (Array.isArray(analytics)) {
      return NextResponse.json(
        analytics.map((row) =>
          row && typeof row === "object" && "saleAmount" in row
            ? omitSaleAmount(row)
            : row,
        ),
      );
    }

    if (
      analytics &&
      typeof analytics === "object" &&
      "saleAmount" in analytics
    ) {
      return NextResponse.json(omitSaleAmount(analytics));
    }

    return NextResponse.json(analytics);
  },
);
