import { getFolderIdsToFilter } from "@/lib/analytics/get-folder-ids-to-filter";
import { convertToCSV } from "@/lib/analytics/utils";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getLinksForWorkspace } from "@/lib/api/links/get-links-for-workspace";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import {
  exportLinksColumns,
  linksExportQuerySchema,
} from "@/lib/zod/schemas/links";
import { Folder } from "@dub/prisma/client";
import { linkConstructor } from "@dub/utils";
import { endOfDay, startOfDay } from "date-fns";
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

    let { columns, ...filters } = linksExportQuerySchema.parse(searchParams);

    const {
      domain,
      folderId,
      search,
      tagId,
      tagIds,
      tagNames,
      tenantId,
      interval,
      start,
      end,
    } = filters;

    if (domain) {
      await getDomainOrThrow({ workspace, domain });
    }

    let selectedFolder: Pick<Folder, "id" | "type"> | null = null;
    if (folderId) {
      selectedFolder = await verifyFolderAccess({
        workspace,
        userId: session.user.id,
        folderId,
        requiredPermission: "folders.read",
      });
    }

    /* we only need to get the folder ids if we are:
      - not filtering by folder
      - filtering by search, domain, tags, or tenantId
    */
    let folderIds: string[] | undefined = undefined;
    if (
      !folderId &&
      (search || domain || tagId || tagIds || tagNames || tenantId)
    ) {
      folderIds = await getFolderIdsToFilter({
        workspace,
        userId: session.user.id,
      });
    }

    if (Array.isArray(folderIds)) {
      folderIds = folderIds?.filter((id) => id !== "");
      if (folderIds.length === 0) {
        folderIds = undefined;
      }
    }

    const { startDate, endDate } = getStartEndDates({
      interval,
      start: start ? startOfDay(new Date(start)) : undefined,
      end: end ? endOfDay(new Date(end)) : undefined,
    });

    const links = await getLinksForWorkspace({
      ...filters,
      workspaceId: workspace.id,
      folderIds,
      searchMode: selectedFolder?.type === "mega" ? "exact" : "fuzzy",
      withTags: columns.includes("tags"),
      includeDashboard: false,
      includeUser: false,
      includeWebhooks: false,
      page: 1,
      pageSize: MAX_LINKS_TO_EXPORT,
      ...(interval !== "all" && {
        startDate,
        endDate,
      }),
    });

    const columnOrderMap = exportLinksColumns.reduce((acc, column, index) => {
      acc[column.id] = index + 1;
      return acc;
    }, {});

    columns = columns.sort(
      (a, b) =>
        (columnOrderMap[a as keyof typeof columnOrderMap] || 999) -
        (columnOrderMap[b as keyof typeof columnOrderMap] || 999),
    );

    const schemaFields: Record<string, z.ZodTypeAny> = {};
    columns.forEach((column) => {
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

      columns.forEach((column) => {
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
