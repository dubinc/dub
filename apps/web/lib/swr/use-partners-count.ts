import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { z } from "zod";
import { PartnersCount } from "../types";
import { partnersCountQuerySchema } from "../zod/schemas/partners";
import useWorkspace from "./use-workspace";

export default function usePartnersCount<T>(
  opts?: z.infer<typeof partnersCountQuerySchema> & { ignoreParams?: boolean },
) {
  const { programId } = useParams();
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const queryString = opts?.ignoreParams
    ? // @ts-ignore
      `?${new URLSearchParams({
        ...(opts.groupBy && { groupBy: opts.groupBy }),
        workspaceId,
        programId,
      }).toString()}`
    : getQueryString(
        {
          ...opts,
          workspaceId,
          programId,
        },
        {
          exclude: ["partnerId"],
        },
      );

  const { data: partnersCount, error } = useSWR<PartnersCount>(
    `/api/partners/count${queryString}`,
    fetcher,
  );

  return {
    partnersCount: partnersCount as T,
    error,
  };
}
