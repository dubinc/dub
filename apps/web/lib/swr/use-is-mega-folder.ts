import { useSearchParams } from "next/navigation";
import useFolder from "./use-folder";

export function useIsMegaFolder() {
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folderId");
  const { folder } = useFolder({
    folderId,
  });
  return {
    folderId,
    isMegaFolder: folderId && folder?.type === "mega" ? true : false,
  };
}
