import { FolderUsersPageClient } from "./page-client";

export default async function FolderUsersPage({
  params,
}: {
  params: { folderId: string };
}) {
  return <FolderUsersPageClient folderId={params.folderId} />;
}
