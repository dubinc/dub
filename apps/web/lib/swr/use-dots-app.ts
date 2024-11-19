import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { DotsApp } from "../dots/types";
import useWorkspace from "./use-workspace";

export default function useDotsApp() {
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<DotsApp>(
    workspaceId ? `/api/dots?workspaceId=${workspaceId}` : null,
    fetcher,
  );

  return {
    data,
    error,
    isLoading: !data && !error,
  };
}
