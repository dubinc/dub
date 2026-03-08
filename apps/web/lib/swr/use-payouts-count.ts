import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import { PayoutsCount } from "../types";
import { payoutsCountQuerySchema } from "../zod/schemas/payouts";
import useWorkspace from "./use-workspace";

export function usePayoutsCount<T>({
  ignoreParams,
  enabled = true,
  ...query
}: z.input<typeof payoutsCountQuerySchema> & {
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
          include: ignoreParams ? [] : ["status", "partnerId", "invoiceId"],
        },
      )}`,
    fetcher,
  );

  return {
    payoutsCount: payoutsCount as T,
    error,
    loading: payoutsCount === undefined && !error,
  };
}
