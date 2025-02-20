import { fetcher, isDubDomain } from "@dub/utils";
import useSWR from "swr";
import { DomainProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useDomain({
  slug,
  enabled,
}: {
  slug: string;
  enabled?: boolean;
}) {
  const { id: workspaceId } = useWorkspace();

  const { data: domain, error } = useSWR<DomainProps>(
    enabled &&
      workspaceId &&
      slug &&
      !isDubDomain(slug) &&
      `/api/domains/${slug}?workspaceId=${workspaceId}`,
    fetcher,
    { refreshInterval: 60000 },
  );

  return {
    ...domain,
    loading: !domain && !error,
  };
}
