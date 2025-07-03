import { InstalledIntegrationProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import useWorkspace from "./use-workspace";

export default function useIntegrations({
  swrOpts,
}: { swrOpts?: SWRConfiguration } = {}) {
  const { id } = useWorkspace();

  const { data: integrations, error } = useSWR<
    Pick<InstalledIntegrationProps, "id" | "name" | "slug">[]
  >(`/api/integrations?workspaceId=${id}`, fetcher, {
    dedupingInterval: 20000,
    revalidateOnFocus: false,
    keepPreviousData: true,
    ...swrOpts,
  });

  return {
    integrations,
    error,
    loading: !integrations && !error,
  };
}
