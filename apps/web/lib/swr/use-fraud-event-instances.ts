import { FraudRuleType } from "@dub/prisma/client";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export function useFraudEventInstances<T = unknown>({
  partnerId,
  type,
}: {
  partnerId: string;
  type: FraudRuleType;
}) {
  const { getQueryString } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();

  const queryString = getQueryString({
    workspaceId,
    partnerId,
    type,
  });

  const { data, isLoading, error } = useSWR<T[]>(
    workspaceId && partnerId && type
      ? `/api/fraud-events/instances${queryString}`
      : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    fraudEvents: data,
    loading: isLoading,
    error,
  };
}
