import { getFolderIdsToFilter } from "@/lib/analytics/get-folder-ids-to-filter";
import { getLinksCount } from "@/lib/api/links";
import { validateLinksQueryFilters } from "@/lib/api/links/validate-links-query-filters";
import { withWorkspace } from "@/lib/auth";
import { getLinksCountQuerySchema } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";

// GET /api/links/count – get the number of links for a workspace
export const GET = withWorkspace(
  async ({ headers, searchParams, workspace, session }) => {
    const filters = getLinksCountQuerySchema.parse(searchParams);

    let { folderIds } = await validateLinksQueryFilters({
      ...filters,
      workspace,
      userId: session.user.id,
    });

    if (
      filters.groupBy &&
      filters.groupBy !== "folderId" &&
      !filters.folderId &&
      !folderIds
    ) {
      folderIds = await getFolderIdsToFilter({
        workspace,
        userId: session.user.id,
      });

      if (Array.isArray(folderIds)) {
        folderIds = folderIds.filter((id) => id !== "");
        if (folderIds.length === 0) {
          folderIds = undefined;
        }
      }
    }

    const count = await getLinksCount({
      ...filters,
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
