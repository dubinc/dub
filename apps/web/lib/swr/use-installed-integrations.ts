import { InstalledIntegrationProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useInstalledIntegrations() {
  const { id } = useWorkspace();

  const { data: integrations, isValidating } = useSWR<
    InstalledIntegrationProps[]
  >(id && `/api/integrations/installations?workspaceId=${id}`, fetcher, {
    dedupingInterval: 30000,
  });

  return {
    integrations,
    loading: integrations ? false : true,
    isValidating,
  };
}
