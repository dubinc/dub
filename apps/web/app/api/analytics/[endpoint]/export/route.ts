import { getAnalytics } from "@/lib/analytics";
import { DubApiError } from "@/lib/api/errors";
import { withAuth } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import prisma from "@/lib/prisma";
import {
  analyticsEndpointSchema,
  getAnalyticsQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { linkConstructor } from "@dub/utils";
import { json2csv } from "json-2-csv";

// converts data to CSV and returns a Response object
const respondCSV = (data: Record<string, string>[], filename: string) => {
  const csv = json2csv(data, {
    parseValue(fieldValue, defaultParser) {
      if (fieldValue instanceof Date) {
        return fieldValue.toISOString();
      }
      return defaultParser(fieldValue);
    },
  });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};

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

    if (endpoint === "top_links") {
      const topLinks = await getAnalytics({
        projectId: project.id,
        endpoint: "top_links",
        ...parsedParams,
      }).then(async (data) => {
        // if project is on the free plan, only return the first 100 links
        const links = project?.plan === "free" ? data.slice(0, 100) : data;

        return await Promise.all(
          links.map(
            async ({
              link: linkId,
              clicks,
            }: {
              link: string;
              clicks: number;
            }) => {
              const link = await prisma.link.findUnique({
                where: {
                  id: linkId,
                },
                select: {
                  domain: true,
                  key: true,
                  url: true,
                },
              });
              if (!link) return;
              return {
                linkId,
                shortLink: linkConstructor({
                  domain: link.domain,
                  key: link.key,
                }),
                domain: link.domain,
                key: link.key,
                url: link.url,
                clicks,
              };
            },
          ),
        );
      });

      if (!topLinks) {
        return new Response(undefined, {
          status: 204,
        });
      }

      return respondCSV(topLinks, "top_links.csv");
    } else {
      const response = await getAnalytics({
        projectId: project.id,
        ...(linkId && { linkId }),
        endpoint,
        ...parsedParams,
      });

      if (response.length === 0) {
        return new Response(undefined, {
          status: 204,
        });
      }

      return respondCSV(response, `${endpoint}.csv`);
    }
  },
  {
    needNotExceededClicks: true,
  },
);
