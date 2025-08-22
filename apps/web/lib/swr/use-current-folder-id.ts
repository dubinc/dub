import { useSearchParams } from "next/navigation";
import useWorkspace from "./use-workspace";

// get the current folder id from the search params or the user's default folder
// normalize the folder id to null if it is "unsorted"
export default function useCurrentFolderId() {
  const { defaultFolderId } = useWorkspace();
  const searchParams = useSearchParams();
  let folderId = searchParams.get("folderId") ?? defaultFolderId ?? null;

  if (folderId === "unsorted") {
    folderId = null;
  }

  return { folderId };
}
