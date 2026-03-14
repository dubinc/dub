import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { parseFilterValue } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = z.object({
  start: z.union([z.iso.date(), z.iso.datetime()]).optional(),
  end: z.union([z.iso.date(), z.iso.datetime()]).optional(),
  event: z.enum(["composite", "clicks", "leads", "sales"]).default("composite"),
  groupBy: z.enum(["timeseries", "count"]).default("timeseries"),
  saleType: z.enum(["new", "recurring"]).optional(),
});

// GET /api/embed/referrals/analytics – get analytics for a partner
export const GET = withReferralsEmbedToken(
  async ({ links, program, searchParams }) => {
    if (links.length === 0) {
      return NextResponse.json(
        querySchema.parse(searchParams).groupBy === "count" ? {} : [],
      );
    }

    const parsed = querySchema.parse(searchParams);

    const analytics = await getAnalytics({
      event: parsed.event,
      groupBy: parsed.groupBy,
      ...(parsed.start && parsed.end
        ? { start: new Date(parsed.start), end: new Date(parsed.end) }
        : { interval: "1y" }),
      ...(parsed.saleType && { saleType: parsed.saleType }),
      linkId: parseFilterValue(links.map((link) => link.id)),
      dataAvailableFrom: program.startedAt ?? program.createdAt,
    });

    return NextResponse.json(analytics);
  },
);
