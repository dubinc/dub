import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { withWorkspace } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { addDays, addMinutes, subDays, subMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";

export const GET = withWorkspace(
  async ({ params, searchParams, workspace, link }) => {
    const parsedParams = analyticsQuerySchema
      .omit({ groupBy: true })
      .and(
        z.object({
          pageIndex: z.coerce.number(),
          pageSize: z.coerce.number().min(1).max(100),
          sortBy: z.enum(["date"]).default("date"),
          sortOrder: z.enum(["asc", "desc"]).default("desc"),
        }),
      )
      .parse(searchParams);

    let {
      event,
      domain,
      key,
      interval,
      start,
      end,
      pageIndex,
      pageSize,
      sortBy,
      sortOrder,
    } = parsedParams;

    validDateRangeForPlan({
      plan: workspace.plan,
      interval,
      start,
      end,
      throwError: true,
    });

    const linkId = link
      ? link.id
      : domain && key === "_root"
        ? await getDomainViaEdge(domain).then((d) => d?.id)
        : null;

    // Fake data
    const response = {
      events: [...Array(pageSize)].map((_, idx) => ({
        type: event,
        link: {
          domain: "dub.localhost",
          key: (12345 + (idx + pageIndex * pageSize) * 12345).toString(36),
          url: "https://dub.co",
        },
        country: "US",
        device: idx % 3 > 0 ? "Desktop" : "Mobile",
        date:
          sortOrder === "desc"
            ? subMinutes(subDays(new Date(), pageIndex), idx)
            : addMinutes(addDays(subDays(new Date(), 300), pageIndex), idx),
      })),
      totalRows: 4322,
    };

    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);
