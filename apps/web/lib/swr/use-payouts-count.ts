import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { z } from "zod";
import { PayoutsCount } from "../types";
import { payoutCountQuerySchema } from "../zod/schemas/partners";
import useWorkspace from "./use-workspace";

export default function usePayoutsCount<T>(
  opts?: z.infer<typeof payoutCountQuerySchema> & { ignoreParams?: boolean },
) {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const queryString = opts?.ignoreParams
    ? // @ts-ignore
      `?${new URLSearchParams({
        ...(opts.groupBy && { groupBy: opts.groupBy }),
        workspaceId,
      }).toString()}`
    : getQueryString({
        ...opts,
        workspaceId,
      });

  const { data: payoutsCount, error } = useSWR<PayoutsCount[]>(
    `/api/programs/${programId}/payouts/count${queryString}`,
    fetcher,
  );

  return {
    payoutsCount: payoutsCount as T,
    error,
    loading: !payoutsCount && !error,
  };
}
