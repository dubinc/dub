import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import * as z from "zod/v4";
import { EnrolledPartnerProps } from "../types";
import { getPartnersQuerySchemaExtended } from "../zod/schemas/partners";
import useWorkspace from "./use-workspace";

const partialQuerySchema = getPartnersQuerySchemaExtended.partial();

type PartnersQuery = z.infer<typeof partialQuerySchema>;

// Blank search is not a query, and URLSearchParams stringifies `undefined` to
// the literal "undefined". Relevance ordering is only valid with a real search.
function buildPartnersQueryString(workspaceId: string, query?: PartnersQuery) {
  const search = query?.search?.trim() || undefined;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries({
    ...query,
    workspaceId,
    search,
    sortBy:
      query?.sortBy ??
      (search && query?.sortOrder !== "asc" ? "relevance" : undefined),
  })) {
    if (value == null || value === "") continue;

    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }

  return params.toString();
}

export default function usePartners(
  {
    query,
    enabled = true,
  }: {
    query?: PartnersQuery;
    enabled?: boolean;
  } = {},
  swrOptions: SWRConfiguration = {},
) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error } = useSWR<EnrolledPartnerProps[]>(
    enabled && workspaceId
      ? `/api/partners?${buildPartnersQueryString(workspaceId, query)}`
      : undefined,
    fetcher,
    {
      keepPreviousData: true,
      ...swrOptions,
    },
  );

  return {
    partners: data,
    loading: isLoading,
    error,
  };
}
