import { useCurrentProduct, useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import * as z from "zod/v4";
import { getCustomersCountQuerySchema } from "../zod/schemas/customers";
import useWorkspace from "./use-workspace";

export default function useCustomersCount<T = number>({
  query,
  enabled = true,
  includeParams = ["country", "partnerId", "linkId", "externalId", "search"],
}: {
  query?: z.infer<typeof getCustomersCountQuerySchema>;
  enabled?: boolean;
  includeParams?: string[];
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const { getQueryString } = useRouterStuff();
  const { product } = useCurrentProduct();

  const { data, error, isLoading } = useSWR<T>(
    enabled &&
      workspaceId &&
      product &&
      `/api/customers/count${getQueryString(
        {
          workspaceId,
          ...(product === "program" &&
            defaultProgramId && {
              programId: defaultProgramId,
            }),
          ...query,
        },
        {
          include: includeParams,
        },
      )}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    loading: isLoading,
    error,
  };
}
