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
const respondCSV = (
  data: Record<string, string | number>[],
  filename: string,
) => {
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
  async ({ params, searchParams, workspace, link }) => {
    const { endpoint } = analyticsEndpointSchema.parse(params);
    const parsedParams = getAnalyticsQuerySchema.parse(searchParams);
    const { domain, key, interval } = parsedParams;

    // return 403 if project is on the free plan and interval is 90d or all
    if (
      workspace?.plan === "free" &&
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
      const data = await getAnalytics({
        workspaceId: workspace.id,
        endpoint: "top_links",
        ...parsedParams,
      });

      const links = await prisma.link.findMany({
        where: {
          projectId: workspace.id,
          id: {
            in: data.map(({ link }) => link),
          },
        },
        select: {
          id: true,
          domain: true,
          key: true,
          clicks: true,
          url: true,
        },
      });

      const domainLinks = await prisma.domain.findMany({
        where: {
          projectId: workspace.id,
          id: {
            in: data.map(({ link }) => link),
          },
        },
        select: {
          id: true,
          slug: true,
          clicks: true,
        },
      });

      const topLinks = links.map((link) => ({
        linkId: link.id,
        shortLink: linkConstructor({
          domain: link.domain,
          key: link.key,
        }),
        domain: link.domain,
        key: link.key,
        url: link.url,
        clicks: link.clicks,
      }));

      topLinks.push(
        ...domainLinks.map((domain) => ({
          linkId: domain.id,
          shortLink: domain.slug,
          domain: domain.slug,
          key: "_root",
          url: `https://${domain.slug}`,
          clicks: domain.clicks,
        })),
      );

      if (!topLinks) {
        return new Response(undefined, {
          status: 204,
        });
      }

      return respondCSV(topLinks, "top_links.csv");
    } else {
      const response = await getAnalytics({
        workspaceId: workspace.id,
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
