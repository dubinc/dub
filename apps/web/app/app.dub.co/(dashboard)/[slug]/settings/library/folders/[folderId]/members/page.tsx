import { FolderUsersPageClient } from "./page-client";

export default async function FolderUsersPage(
  props: {
    params: Promise<{ folderId: string }>;
  }
) {
  const params = await props.params;
  const { folderId } = params;

  return <FolderUsersPageClient folderId={folderId} />;
}
