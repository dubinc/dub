import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import useWorkspace from "../../swr/use-workspace";
import { PartnerApplicationProps } from "../../types";
import { getPartnerApplicationsQuerySchema } from "../../zod/schemas/program-application";

export function useProgramApplications({
  ignoreParams,
  enabled,
  ...params
}: z.input<typeof getPartnerApplicationsQuerySchema> & {
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
        exclude: ["partnerId", "sortBy"],
      });

  const {
    data: applications,
    error,
    isValidating,
  } = useSWR<PartnerApplicationProps[]>(
    enabled !== false && defaultProgramId
      ? `/api/program-applications${queryString}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  return {
    applications,
    error,
    isValidating,
    loading: enabled !== false && !error && applications === undefined,
  };
}
