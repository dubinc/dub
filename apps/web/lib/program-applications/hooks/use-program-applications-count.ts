import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import useWorkspace from "../../swr/use-workspace";
import { getProgramApplicationsCountQuerySchema } from "../../zod/schemas/program-application";

export function useProgramApplicationsCount<T>({
  ignoreParams,
  enabled,
  ...params
}: z.input<typeof getProgramApplicationsCountQuerySchema> & {
  ignoreParams?: boolean;
  enabled?: boolean;
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const definedParams = Object.fromEntries(
    Object.entries({ ...params, workspaceId }).filter(
      ([, value]) => value !== undefined && value !== null,
    ),
  );

  const queryString = ignoreParams
    ? `?${new URLSearchParams(definedParams as Record<string, string>).toString()}`
    : getQueryString(definedParams, {
        exclude: ["partnerId", "applicationId", "sortBy", "sortOrder", "page"],
      });

  const {
    data: applicationsCount,
    error,
    isValidating,
  } = useSWR<number>(
    enabled !== false && defaultProgramId
      ? `/api/program-applications/count${queryString}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    applicationsCount: applicationsCount as T,
    error,
    loading: enabled !== false && !error && applicationsCount === undefined,
    isValidating,
  };
}
