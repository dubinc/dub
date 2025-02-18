import { getFolderIdsToFilter } from "@/lib/analytics/get-folder-ids-to-filter";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getLinksCount } from "@/lib/api/links";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { getLinksCountQuerySchema } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";

// GET /api/links/count – get the number of links for a workspace
export const GET = withWorkspace(
  async ({ headers, searchParams, workspace, session }) => {
    const params = getLinksCountQuerySchema.parse(searchParams);
    const { groupBy, domain, folderId, search, tagId, tagIds, tagNames } =
      params;

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

    /* we only need to get the folder ids if we are:
      - not filtering by folder
      - there's a groupBy
      - filtering by search, domain, or tags
    */
    const folderIds =
      !folderId && (groupBy || search || domain || tagId || tagIds || tagNames)
        ? await getFolderIdsToFilter({
            workspace,
            userId: session.user.id,
          })
        : undefined;

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
