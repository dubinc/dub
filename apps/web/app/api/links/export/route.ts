import { convertToCSV } from "@/lib/analytics/utils";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getLinksCount } from "@/lib/api/links";
import { getLinksForWorkspace } from "@/lib/api/links/get-links-for-workspace";
import { validateLinksQueryFilters } from "@/lib/api/links/validate-links-query-filters";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import {
  exportLinksColumns,
  linksExportQuerySchema,
} from "@/lib/zod/schemas/links";
import { APP_DOMAIN_WITH_NGROK, linkConstructor } from "@dub/utils";
import { endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";

const columnIdToLabel = exportLinksColumns.reduce((acc, column) => {
  acc[column.id] = column.label;
  return acc;
}, {});

const numericColumns = exportLinksColumns
  .filter((column) => "numeric" in column && column.numeric)
  .map((column) => column.id);

const MAX_LINKS_TO_EXPORT = 1000;

// GET /api/links/export – export links to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    throwIfClicksUsageExceeded(workspace);

    const { columns, ...filters } = linksExportQuerySchema.parse(searchParams);

    const { selectedFolder, folderIds } = await validateLinksQueryFilters({
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
          ...filters,
          workspaceId: workspace.id,
          userId: session.user.id,
          columns: columns.join(","),
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
      searchMode: selectedFolder?.type === "mega" ? "exact" : "fuzzy",
      withTags: columns.includes("tags"),
      includeDashboard: false,
      includeUser: false,
      includeWebhooks: false,
      page: 1,
      pageSize: MAX_LINKS_TO_EXPORT,
      workspaceId: workspace.id,
      folderIds,
    });

    const columnOrderMap = exportLinksColumns.reduce((acc, column, index) => {
      acc[column.id] = index + 1;
      return acc;
    }, {});

    const exportColumns = columns.sort(
      (a, b) =>
        (columnOrderMap[a as keyof typeof columnOrderMap] || 999) -
        (columnOrderMap[b as keyof typeof columnOrderMap] || 999),
    );

    const schemaFields: Record<string, z.ZodTypeAny> = {};
    exportColumns.forEach((column) => {
      if (numericColumns.includes(column as any)) {
        schemaFields[columnIdToLabel[column as keyof typeof columnIdToLabel]] =
          z.coerce.number().optional().default(0);
      } else {
        schemaFields[columnIdToLabel[column as keyof typeof columnIdToLabel]] =
          z.string().optional().default("");
      }
    });

    const formattedLinks = links.map((link) => {
      const result: Record<string, any> = {};

      exportColumns.forEach((column) => {
        let value = link[column as keyof typeof link] || "";

        // Handle special cases
        if (column === "link") {
          value = linkConstructor({ domain: link.domain, key: link.key });
        } else if (column === "tags") {
          value =
            link.tags?.map((tag) => (tag as any).tag.name).join(", ") || "";
        }

        // Handle date fields - convert to ISO string format
        if (
          (column === "createdAt" || column === "updatedAt") &&
          value instanceof Date
        ) {
          value = value.toISOString();
        }

        result[columnIdToLabel[column as keyof typeof columnIdToLabel]] = value;
      });

      return z.object(schemaFields).parse(result);
    });

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
