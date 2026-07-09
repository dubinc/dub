import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { PayoutsCount, PayoutsCountQueryFilters } from "../types";
import useWorkspace from "./use-workspace";

export function usePayoutsCount({
  ignoreParams,
  enabled = true,
  ...query
}: PayoutsCountQueryFilters & {
  ignoreParams?: boolean;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data: payoutsCount, error } = useSWR<PayoutsCount[]>(
    workspaceId &&
      defaultProgramId &&
      enabled &&
      `/api/payouts/count${getQueryString(
        {
          ...query,
          workspaceId,
        },
        {
          include: ignoreParams
            ? []
            : ["status", "partnerId", "invoiceId", "groupId"],
        },
      )}`,
    fetcher,
  );

  return {
    payoutsCount,
    error,
    loading: payoutsCount === undefined && !error,
  };
}
