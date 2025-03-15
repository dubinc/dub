import { FolderSummary } from "@/lib/types";

export const isDefaultFolder = ({
  folder,
  defaultFolderId,
}: {
  folder: FolderSummary;
  defaultFolderId: string | null | undefined;
}) => {
  const folderId = folder.id === "unsorted" ? null : folder.id;

  return folderId === defaultFolderId;
};
