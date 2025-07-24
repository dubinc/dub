import { getFolderIdsToFilter } from "@/lib/analytics/get-folder-ids-to-filter";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getLinksCount } from "@/lib/api/links";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { getLinksCountTB } from "@/lib/tinybird/get-links-count";
import { WorkspaceProps } from "@/lib/types";
import { getLinksCountQuerySchemaExtended } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";

// A mega workspace is a workspace with more than 1M links
function isMegaWorkspace(workspace: Pick<WorkspaceProps, "totalLinks">) {
  return workspace.totalLinks > 1_000_000;
}

// GET /api/links/count – get the number of links for a workspace
export const GET = withWorkspace(
  async ({ headers, searchParams, workspace, session }) => {
    const params = getLinksCountQuerySchemaExtended.parse(searchParams);
    const {
      groupBy,
      domain,
      folderId,
      search,
      tagId,
      tagIds,
      tagNames,
      tenantId,
      start,
      end,
      interval,
      timezone,
    } = params;

    if (domain) {
      await getDomainOrThrow({ domain, workspace: workspace });
    }

    if (folderId) {
      await verifyFolderAccess({
        workspace,
        userId: session.user.id,
        folderId,
        requiredPermission: "folders.read",
      });
    }

    // For mega workspaces, we fetch the count via Tinybird instead of MySQL
    if (isMegaWorkspace(workspace)) {
      // We don't support groupBy for mega workspaces
      if (groupBy) {
        return NextResponse.json([], {
          headers,
        });
      }

      const { startDate, endDate } = getStartEndDates({
        start,
        end,
        interval,
      });

      console.log("isMegaWorkspace", {
        start,
        end,
        startDate,
        endDate,
        folderId,
        timezone,
      });

      const { data } = await getLinksCountTB({
        workspaceId: workspace.id,
        folderId,
        timezone,
        start: startDate.toISOString().replace("T", " ").replace("Z", ""),
        end: endDate.toISOString().replace("T", " ").replace("Z", ""),
      });

      return NextResponse.json(data[0].count, {
        headers,
      });
    }

    /* we only need to get the folder ids if we are:
      - not filtering by folder
      - there's a groupBy
      - filtering by search, domain, tags, or tenantId
    */
    let folderIds =
      !folderId &&
      (groupBy || search || domain || tagId || tagIds || tagNames || tenantId)
        ? await getFolderIdsToFilter({
            workspace,
            userId: session.user.id,
          })
        : undefined;

    if (Array.isArray(folderIds)) {
      folderIds = folderIds?.filter((id) => id !== "");
      if (folderIds.length === 0) {
        folderIds = undefined;
      }
    }

    const count = await getLinksCount({
      searchParams: params,
      workspaceId: workspace.id,
      folderIds,
    });

    return NextResponse.json(count, {
      headers,
    });
  },
  {
    requiredPermissions: ["links.read"],
  },
);
