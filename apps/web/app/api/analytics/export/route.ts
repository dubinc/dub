import { VALID_TINYBIRD_ENDPOINTS, getAnalytics } from "@/lib/analytics";
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
import JSZip from "jszip";

// converts data to CSV
const convertToCSV = (data: object[]) => {
  return json2csv(data, {
    parseValue(fieldValue, defaultParser) {
      if (fieldValue instanceof Date) {
        return fieldValue.toISOString();
      }
      return defaultParser(fieldValue);
    },
  });
};

// GET /api/analytics/[endpoint]/export – get export data for analytics
export const GET = withAuth(
  async ({ searchParams, workspace, link }) => {
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

    const zip = new JSZip();

    await Promise.all(
      VALID_TINYBIRD_ENDPOINTS.map(async (endpoint) => {
        if (endpoint === "top_links") {
          // no need to fetch top links data if linkId is defined
          // since this is just a single link
          if (linkId) return;

          const data = await getAnalytics({
            workspaceId: workspace.id,
            endpoint: "top_links",
            ...parsedParams,
          });

          const [links, domains] = await Promise.all([
            prisma.link.findMany({
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
                url: true,
              },
            }),
            prisma.domain.findMany({
              where: {
                projectId: workspace.id,
                id: {
                  in: data.map(({ link }) => link),
                },
              },
              select: {
                id: true,
                slug: true,
                target: true,
              },
            }),
          ]);

          const allLinks = [
            ...links.map((link) => ({
              linkId: link.id,
              shortLink: linkConstructor({
                domain: link.domain,
                key: link.key,
                pretty: true,
              }),
              url: link.url,
            })),
            ...domains.map((domain) => ({
              linkId: domain.id,
              shortLink: linkConstructor({
                domain: domain.slug,
                pretty: true,
              }),
              url: domain.target || "",
            })),
          ];

          const topLinks = data.map((d) => ({
            ...allLinks.find((l) => l.linkId === d.link),
            clicks: d.clicks,
          }));

          if (!topLinks || topLinks.length === 0) return;

          const csvData = convertToCSV(topLinks);

          zip.file(`${endpoint}.csv`, csvData);
        } else {
          // skip clicks endpoint
          if (endpoint === "clicks") return;
          // we're not fetching top URLs data if linkId is not defined
          if (endpoint === "top_urls" && !linkId) return;

          const response = await getAnalytics({
            workspaceId: workspace.id,
            ...(linkId && { linkId }),
            endpoint,
            ...parsedParams,
          });
          if (!response || response.length === 0) return;

          const csvData = convertToCSV(response);
          zip.file(`${endpoint}.csv`, csvData);
        }
      }),
    );

    const zipData = await zip.generateAsync({ type: "nodebuffer" });

    return new Response(zipData, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=analytics_export.zip",
      },
    });
  },
  {
    needNotExceededClicks: true,
  },
);
