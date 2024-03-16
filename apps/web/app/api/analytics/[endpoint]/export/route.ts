import { getAnalytics } from "@/lib/analytics";
import { DubApiError } from "@/lib/api/errors";
import { withAuth } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import {
  analyticsEndpointSchema,
  getAnalyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { json2csv } from "json-2-csv";

// GET /api/analytics/[endpoint]/export – get export data for analytics
export const GET = withAuth(
  async ({ params, searchParams, project, link }) => {
    const { endpoint } = analyticsEndpointSchema.parse(params);
    const parsedParams = getAnalyticsQuerySchema.parse(searchParams);
    const { domain, key, interval } = parsedParams;

    // return 403 if project is on the free plan and interval is 90d or all
    if (
      project?.plan === "free" &&
      (interval === "all" || interval === "90d")
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: "Require higher plan",
      });
    }

    const linkId = link
      ? link.id
      : domain && key === "_root"
        ? await getDomainViaEdge(domain).then((d) => d?.id)
        : null;

    const response = await getAnalytics({
      projectId: project.id,
      ...(linkId && { linkId }),
      endpoint,
      ...parsedParams,
    });

    console.log(response.length);

    // if there is no data to export so return 204
    if (response.length === 0) {
      return new Response(undefined, {
        status: 204,
      });
    }

    // convert the response to CSV
    const csv = json2csv(
      endpoint === "timeseries"
        ? response.map((entry: { start: Date; clicks: number }) => ({
            date: entry.start,
            clicks: entry.clicks,
          }))
        : response,
      {
        parseValue(fieldValue, defaultParser) {
          if (fieldValue instanceof Date) {
            return fieldValue.toISOString();
          }

          return defaultParser(fieldValue);
        },
      },
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="clicks.csv"`,
      },
    });
  },
  {
    needNotExceededClicks: true,
  },
);
