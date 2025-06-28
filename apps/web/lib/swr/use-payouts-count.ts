import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { PayoutsCount } from "../types";
import { payoutsCountQuerySchema } from "../zod/schemas/payouts";
import useWorkspace from "./use-workspace";

export default function usePayoutsCount<T>(
  opts?: z.input<typeof payoutsCountQuerySchema>,
) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data: payoutsCount, error } = useSWR<PayoutsCount[]>(
    workspaceId &&
      defaultProgramId &&
      `/api/programs/${defaultProgramId}/payouts/count${getQueryString(
        {
          ...opts,
          workspaceId,
        },
        {
          include: ["status", "partnerId"],
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
