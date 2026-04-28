import { fetcher } from "@dub/utils";
import useSWR from "swr";

export interface CommissionsTopPartner {
  partnerId: string;
  name: string;
  image: string | null;
  country: string | null;
  groupId: string | null;
  groupName: string | null;
  earnings: number;
  commissionCount: number;
}

export default function useCommissionsTopPartners({
  queryString,
  enabled = true,
}: {
  queryString: string;
  enabled?: boolean;
}) {
  const { data, error, isLoading } = useSWR<CommissionsTopPartner[]>(
    enabled && queryString
      ? `/api/commissions/top-partners?${queryString}`
      : null,
    fetcher,
    { keepPreviousData: true },
  );

  return { partners: data, isLoading, error };
}
