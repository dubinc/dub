import { fetcher } from "@dub/utils";
import useSWR from "swr";

export type CommissionsBreakdownItem = {
  key: string;
  label: string;
  earnings: number;
  count: number;
};

export type CommissionsBreakdownGroupBy = "type" | "groupId";

export default function useCommissionsBreakdown({
  queryString,
  groupBy,
  enabled = true,
}: {
  queryString: string;
  groupBy: CommissionsBreakdownGroupBy;
  enabled?: boolean;
}) {
  const url =
    enabled && queryString
      ? `/api/commissions/breakdown?groupBy=${groupBy}&${queryString}`
      : null;

  const { data, error, isLoading } = useSWR<CommissionsBreakdownItem[]>(
    url,
    fetcher,
    { keepPreviousData: true },
  );

  return { data, isLoading, error };
}
