import { InstalledIntegrationProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useIntegrations() {
  const { id } = useWorkspace();

  const { data: integrations, error } = useSWR<
    Pick<InstalledIntegrationProps, "id" | "name" | "slug">[]
  >(`/api/integrations?workspaceId=${id}`, fetcher, {
    dedupingInterval: 20000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  return {
    integrations,
    error,
    loading: !integrations && !error,
  };
}
