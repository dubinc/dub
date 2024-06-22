import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { convertToCSV, validDateRangeForPlan } from "@/lib/analytics/utils";
import { getLink } from "@/lib/api/links/get-link";
import { withWorkspace } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import JSZip from "jszip";

// GET /api/analytics/export – get export data for analytics
export const GET = withWorkspace(
  async ({ searchParams, workspace }) => {
    const parsedParams = analyticsQuerySchema.parse(searchParams);

    const { interval, start, end, linkId, domain, key } = parsedParams;

    const link =
      domain && key ? await getLink({ workspace, domain, key }) : null;

    validDateRangeForPlan({
      plan: workspace.plan,
      interval,
      start,
      end,
      throwError: true,
    });

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
          ...(link && { linkId: link.id }),
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
