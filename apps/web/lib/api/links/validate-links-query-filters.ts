import { getFolderIdsToFilter } from "@/lib/analytics/get-folder-ids-to-filter";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { WorkspaceProps } from "@/lib/types";
import { getLinksQuerySchemaExtended } from "@/lib/zod/schemas/links";
import { z } from "zod";
import { getDomainOrThrow } from "../domains/get-domain-or-throw";

interface LinksQueryFilters
  extends Partial<z.infer<typeof getLinksQuerySchemaExtended>> {
  userId: string;
  workspace: Pick<WorkspaceProps, "id" | "plan" | "foldersUsage" | "users">;
}

export async function validateLinksQueryFilters({
  domain,
  search,
  tagId,
  tagIds,
  tagNames,
  linkIds,
  tenantId,
  folderId,
  userId,
  workspace,
}: LinksQueryFilters) {
  let folderIds: string[] | undefined = undefined;

  if (domain) {
    await getDomainOrThrow({
      domain,
      workspace,
    });
  }

  if (folderId) {
    await verifyFolderAccess({
      workspace,
      userId,
      folderId,
      requiredPermission: "folders.read",
    });
  }

  /* we only need to get the folder ids if we are:
      - not filtering by folder
      - filtering by search, domain, tags, tenantId, or linkIds
    */
  if (
    !folderId &&
    (search || domain || tagId || tagIds || tagNames || tenantId || linkIds)
  ) {
    folderIds = await getFolderIdsToFilter({
      workspace,
      userId,
    });
  }

  if (Array.isArray(folderIds)) {
    folderIds = folderIds?.filter((id) => id !== "");
    if (folderIds.length === 0) {
      folderIds = undefined;
    }
  }

  return {
    folderIds,
  };
}
