import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { withWorkspace } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { nanoid } from "@dub/utils";
import { subDays, subMinutes } from "date-fns";
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
        }),
      )
      .parse(searchParams);

    let { event, domain, key, interval, start, end, pageIndex, pageSize } =
      parsedParams;

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

    const response = {
      events: [...Array(pageSize)].map((_, idx) => ({
        link: {
          domain: "dub.localhost",
          key: nanoid(),
          url: "https://dub.co",
        },
        country: "US",
        device: Math.random() > 0.25 ? "Desktop" : "Mobile",
        date: subMinutes(subDays(new Date(), pageIndex), idx),
      })),
      totalRows: 4322,
    };

    return NextResponse.json(response);
  },
  {
    needNotExceededClicks: true,
  },
);
