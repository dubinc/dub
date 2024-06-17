import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { convertToCSV, validDateRangeForPlan } from "@/lib/analytics/utils";
import { throwIfNoAccess } from "@/lib/api/tokens/permissions";
import { withWorkspace } from "@/lib/auth";
import { getDomainViaEdge } from "@/lib/planetscale";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import JSZip from "jszip";

// GET /api/analytics/[endpoint]/export – get export data for analytics
export const GET = withWorkspace(
  async ({ searchParams, workspace, link, scopes }) => {
    throwIfNoAccess({
      scopes,
      requiredAnyOf: ["analytics.read"],
    });

    const parsedParams = analyticsQuerySchema.parse(searchParams);
    const { domain, key, interval, start, end } = parsedParams;

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

    const zip = new JSZip();

    await Promise.all(
      VALID_ANALYTICS_ENDPOINTS.map(async (endpoint) => {
        // no need to fetch top links data if linkId is defined
        // since this is just a single link
        if (endpoint === "top_links" && linkId) return;
        // we're not fetching top URLs data if linkId is not defined
        if (endpoint === "top_urls" && !linkId) return;
        // skip clicks count
        if (endpoint === "count") return;

        const response = await getAnalytics({
          ...parsedParams,
          workspaceId: workspace.id,
          ...(linkId && { linkId }),
          event: "clicks",
          groupBy: endpoint,
        });
        if (!response || response.length === 0) return;

        const csvData = convertToCSV(response);
        zip.file(`${endpoint}.csv`, csvData);
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
