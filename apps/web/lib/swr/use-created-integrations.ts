import { CreatedIntegrationProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useCreatedIntegrations() {
  const { id } = useWorkspace();

  const { data: integrations, isValidating } = useSWR<
    CreatedIntegrationProps[]
  >(id && `/api/integrations?workspaceId=${id}`, fetcher, {
    dedupingInterval: 30000,
  });

  return {
    integrations,
    loading: integrations ? false : true,
    isValidating,
  };
}
