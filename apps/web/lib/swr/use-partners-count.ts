import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import { PartnersCount } from "../types";
import { partnersCountQuerySchema } from "../zod/schemas/partners";
import useWorkspace from "./use-workspace";

export default function usePartnersCount<T>({
  ignoreParams,
  enabled,
  ...params
}: z.infer<typeof partnersCountQuerySchema> & {
  ignoreParams?: boolean;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  // URLSearchParams stringifies an undefined value to "undefined", which then
  // fails the enum parsing in partnersCountQuerySchema. The filter dropdowns hit
  // this whenever a search is active, because that is when `status` is left
  // undefined rather than defaulting to "approved".
  const definedParams = Object.fromEntries(
    Object.entries({ ...params, workspaceId }).filter(
      ([, value]) => value !== undefined && value !== null,
    ),
  );

  const queryString = ignoreParams
    ? `?${new URLSearchParams(definedParams as Record<string, string>).toString()}`
    : getQueryString(definedParams, {
        exclude: ["partnerId"],
      });

  const {
    data: partnersCount,
    error,
    isValidating,
  } = useSWR<PartnersCount>(
    enabled !== false && defaultProgramId
      ? `/api/partners/count${queryString}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    partnersCount: partnersCount as T,
    error,
    loading: enabled !== false && !error && partnersCount === undefined,
    isValidating,
  };
}
