import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { nullifyAnalyticsSaleAmounts } from "@/lib/partners/hide-partner-revenue";
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

    return NextResponse.json(
      isPartnerRevenueHidden(group)
        ? nullifyAnalyticsSaleAmounts(analytics)
        : analytics,
    );
  },
);
