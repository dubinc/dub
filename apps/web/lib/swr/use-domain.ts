import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { DomainProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useDomain(slug: string) {
  const { id: workspaceId } = useWorkspace();

  const { data: domain, error } = useSWR<DomainProps>(
    workspaceId && slug && `/api/domains/${slug}?workspaceId=${workspaceId}`,
    fetcher,
  );

  return {
    ...domain,
    loading: !domain && !error,
  };
}
