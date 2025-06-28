import { FolderUsersPageClient } from "./page-client";

export default async function FolderUsersPage({
  params,
}: {
  params: { folderId: string };
}) {
  const { folderId } = params;

  return <FolderUsersPageClient folderId={folderId} />;
}
