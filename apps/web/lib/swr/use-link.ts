import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { ExpandedLinkProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useLink(linkId: string) {
  const { id: workspaceId } = useWorkspace();

  const { data: link, error } = useSWR<ExpandedLinkProps>(
    workspaceId && linkId && `/api/links/${linkId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  return {
    link,
    loading: !link && !error,
  };
}
