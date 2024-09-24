import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getLinksCount } from "@/lib/api/links";
import { withWorkspace } from "@/lib/auth";
import { getFolderWithUserOrThrow } from "@/lib/link-folder/get-folder";
import { getFolders } from "@/lib/link-folder/get-folders";
import { throwIfFolderActionDenied } from "@/lib/link-folder/permissions";
import { getLinksCountQuerySchema } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";

// GET /api/links/count – get the number of links for a workspace
export const GET = withWorkspace(
  async ({ headers, searchParams, workspace, session }) => {
    const params = getLinksCountQuerySchema.parse(searchParams);
    const { domain, folderId } = params;

    if (domain) {
      await getDomainOrThrow({ domain, workspace: workspace });
    }

    if (folderId) {
      const { folder, folderUser } = await getFolderWithUserOrThrow({
        folderId,
        workspaceId: workspace.id,
        userId: session.user.id,
      });

      throwIfFolderActionDenied({
        folder,
        folderUser,
        requiredPermission: "folders.read",
      });
    }

    const folders = await getFolders({
      workspaceId: workspace.id,
      userId: session.user.id,
    });

    const count = await getLinksCount({
      searchParams: params,
      workspaceId: workspace.id,
      folderIds: folders.map((folder) => folder.id),
    });

    return NextResponse.json(count, {
      headers,
    });
  },
  {
    requiredPermissions: ["links.read"],
  },
);
