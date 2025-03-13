import { getFolderIdsToFilter } from "@/lib/analytics/get-folder-ids-to-filter";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getLinksCount } from "@/lib/api/links";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { getLinksCountQuerySchema } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";

// GET /api/links/count – get the number of links for a workspace
export const GET = withWorkspace(
  async ({ headers, searchParams, workspace, session }) => {
    const params = getLinksCountQuerySchema.parse(searchParams);
    const {
      groupBy,
      domain,
      folderId,
      search,
      tagId,
      tagIds,
      tagNames,
      tenantId,
    } = params;

    if (domain) {
      await getDomainOrThrow({ domain, workspace: workspace });
    }

    if (folderId) {
      const selectedFolder = await verifyFolderAccess({
        workspace,
        userId: session.user.id,
        folderId,
        requiredPermission: "folders.read",
      });
      if (selectedFolder.type === "mega") {
        throw new DubApiError({
          code: "bad_request",
          message: "Cannot get links count for mega folders.",
        });
      }
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
