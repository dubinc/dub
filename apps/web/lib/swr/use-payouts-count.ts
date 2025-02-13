import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { z } from "zod";
import { PayoutsCount } from "../types";
import { payoutsCountQuerySchema } from "../zod/schemas/payouts";
import useWorkspace from "./use-workspace";

export default function usePayoutsCount<T>(
  opts?: z.input<typeof payoutsCountQuerySchema>,
) {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const { data: payoutsCount, error } = useSWR<PayoutsCount[]>(
    workspaceId &&
      `/api/programs/${programId}/payouts/count${getQueryString(
        {
          ...opts,
          workspaceId,
        },
        {
          exclude: ["payoutId"],
        },
      )}`,
    fetcher,
  );

  return {
    payoutsCount: payoutsCount as T,
    error,
    loading: !payoutsCount && !error,
  };
}
