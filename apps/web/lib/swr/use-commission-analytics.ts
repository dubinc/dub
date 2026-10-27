import type {
  CommissionAnalyticsByGroup,
  CommissionAnalyticsGroupBy,
  CommissionAnalyticsQuery,
} from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export type CommissionAnalyticsFilterKey = Extract<
  keyof CommissionAnalyticsQuery,
  "partnerId" | "groupId" | "partnerTagId" | "type"
>;

interface UseCommissionAnalyticsProps<G extends CommissionAnalyticsGroupBy>
  extends Partial<Omit<CommissionAnalyticsQuery, "groupBy">> {
  groupBy: G;
  exclude?: CommissionAnalyticsFilterKey[];
  enabled?: boolean;
}

function serializeCommissionAnalyticsFilters(
  filters: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null) continue;
    out[k] = v instanceof Date ? v.toISOString() : String(v);
  }
  return out;
}

export default function useCommissionAnalytics<
  G extends CommissionAnalyticsGroupBy,
>({ exclude, enabled = true, ...filters }: UseCommissionAnalyticsProps<G>) {
  const { id: workspaceId } = useWorkspace();
  const { getQueryString } = useRouterStuff();

  const serialized = serializeCommissionAnalyticsFilters(
    filters as Record<string, unknown>,
  );

  const querySuffix = getQueryString(
    {
      ...serialized,
      ...(workspaceId ? { workspaceId } : {}),
      timezone:
        serialized.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    {
      exclude: [
        "pageTab",
        "tab",
        "event",
        "saleUnit",
        "view",
        "commissionUnit",
        "page",
        "pageSize",
        "slug",
        "folderId",
        "customerId",
        "programId",
        ...(exclude ?? []),
      ],
    },
  );

  const url =
    workspaceId && enabled ? `/api/commissions/analytics${querySuffix}` : null;

  const { data, error, isLoading } = useSWR<CommissionAnalyticsByGroup[G]>(
    url,
    fetcher,
    { keepPreviousData: true },
  );

  return { data, isLoading, error };
}
