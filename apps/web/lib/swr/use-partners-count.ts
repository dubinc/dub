import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { z } from "zod";
import { PartnersCount } from "../types";
import { partnersCountQuerySchema } from "../zod/schemas/partners";
import useWorkspace from "./use-workspace";

export default function usePartnersCount<T>({
  ignoreParams,
  programId: programIdArg,
  enabled,
  ...params
}: z.infer<typeof partnersCountQuerySchema> & {
  programId?: string;
  ignoreParams?: boolean;
  enabled?: boolean;
} = {}) {
  const { programId: programIdParam } = useParams();
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const programId = programIdArg || programIdParam;

  const queryString = ignoreParams
    ? // @ts-ignore
      `?${new URLSearchParams({
        ...(params.groupBy && { groupBy: params.groupBy }),
        workspaceId,
        programId,
      }).toString()}`
    : getQueryString(
        {
          ...params,
          workspaceId,
          programId,
        },
        {
          exclude: ["partnerId"],
        },
      );

  const { data: partnersCount, error } = useSWR<PartnersCount>(
    enabled !== false ? `/api/partners/count${queryString}` : null,
    fetcher,
  );

  return {
    partnersCount: partnersCount as T,
    error,
  };
}
