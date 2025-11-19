import { convertToCSV } from "@/lib/analytics/utils";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getLinksCount } from "@/lib/api/links";
import { formatLinksForExport } from "@/lib/api/links/format-links-for-export";
import { getLinksForWorkspace } from "@/lib/api/links/get-links-for-workspace";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { validateLinksQueryFilters } from "@/lib/api/links/validate-links-query-filters";
import { withWorkspace } from "@/lib/auth";
import { MEGA_WORKSPACE_LINKS_LIMIT } from "@/lib/constants/misc";
import { qstash } from "@/lib/cron";
import { linksExportQuerySchema } from "@/lib/zod/schemas/links";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";

const MAX_LINKS_TO_EXPORT = 1000;

// GET /api/links/export – export links to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    throwIfClicksUsageExceeded(workspace);

    const { columns, ...filters } = linksExportQuerySchema.parse(searchParams);

    const { folderIds } = await validateLinksQueryFilters({
      ...filters,
      workspace,
      userId: session.user.id,
    });

    const { interval, start, end } = filters;

    const { startDate, endDate } = getStartEndDates({
      interval,
      start: start ? startOfDay(new Date(start)) : undefined,
      end: end ? endOfDay(new Date(end)) : undefined,
    });

    const linksCount = (await getLinksCount({
      ...filters,
      workspaceId: workspace.id,
      folderIds,
    })) as number;

    // Process the export in the background if the number of links is greater than MAX_LINKS_TO_EXPORT
    if (linksCount > MAX_LINKS_TO_EXPORT) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/export`,
        body: {
          ...searchParams,
          workspaceId: workspace.id,
          userId: session.user.id,
        },
      });

      return NextResponse.json({}, { status: 202 });
    }

    const links = await getLinksForWorkspace({
      ...filters,
      ...(interval !== "all" && {
        startDate,
        endDate,
      }),
      searchMode:
        workspace.totalLinks > MEGA_WORKSPACE_LINKS_LIMIT ? "exact" : "fuzzy",
      includeDashboard: false,
      includeUser: false,
      includeWebhooks: false,
      page: 1,
      pageSize: MAX_LINKS_TO_EXPORT,
      workspaceId: workspace.id,
      folderIds,
    });

    const formattedLinks = formatLinksForExport(links, columns);
    const csvData = convertToCSV(formattedLinks);

    return new Response(csvData, {
      headers: {
        "Content-Type": "application/csv",
        "Content-Disposition": "attachment",
      },
    });
  },
  {
    requiredPermissions: ["links.read"],
  },
);
