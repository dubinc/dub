import { useMemo } from "react";
import usePartnersCount from "./use-partners-count";

export function usePartnersCountByGroupIds({
  groupIds,
}: {
  groupIds?: string[] | null;
}) {
  const { partnersCount: groupCount, loading } = usePartnersCount<
    | {
        groupId: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "groupId",
    ignoreParams: true,
    enabled: !!groupIds,
  });

  const totalPartners = useMemo(() => {
    if (!groupIds || groupIds.length === 0) {
      // if no groups set, return all partners
      return groupCount?.reduce((acc, curr) => acc + curr._count, 0) ?? 0;
    }

    return (
      groupCount?.reduce((acc, curr) => {
        if (groupIds.includes(curr.groupId)) {
          return acc + curr._count;
        }
        return acc;
      }, 0) ?? 0
    );
  }, [groupCount, groupIds]);

  return { totalPartners, loading };
}
