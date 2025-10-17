import useCurrentFolderId from "./use-current-folder-id";
import useFolder from "./use-folder";

export function useIsMegaFolder() {
  const { folderId } = useCurrentFolderId();
  const { folder } = useFolder({
    folderId,
  });
  return {
    folderId,
    isMegaFolder: folderId && folder?.type === "mega" ? true : false,
  };
}
