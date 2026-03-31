import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PartnerGroupDefaultLink } from "../types";
import useWorkspace from "./use-workspace";

export default function usePartnerGroupDefaultLinks() {
  const { id: workspaceId } = useWorkspace();
  const { groupSlug } = useParams<{ groupSlug: string }>();

  const { data, error } = useSWR<PartnerGroupDefaultLink[]>(
    workspaceId && groupSlug
      ? `/api/groups/${groupSlug}/default-links?workspaceId=${workspaceId}`
      : undefined,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    defaultLinks: data,
    loading: !data && !error,
    error,
  };
}
