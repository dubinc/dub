import { useSearchParams } from "next/navigation";
import useWorkspace from "./use-workspace";

export default function useCurrentFolderId() {
  const { defaultFolderId } = useWorkspace();
  const searchParams = useSearchParams();
  let folderId = searchParams.get("folderId") ?? defaultFolderId ?? null;

  if (folderId === "unsorted") {
    folderId = null;
  }

  return { folderId };
}
