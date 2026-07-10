import { PartnerProgramSharedPlatformProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export function usePartnerSharedPlatforms({
  partnerId,
  enabled = true,
}: {
  partnerId: string | null | undefined;
  enabled?: boolean;
}) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error } = useSWR<
    PartnerProgramSharedPlatformProps[]
  >(
    enabled && partnerId && workspaceId
      ? `/api/partners/${partnerId}/shared-platforms?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  return {
    sharedPlatforms: data,
    isLoading,
    error,
  };
}
