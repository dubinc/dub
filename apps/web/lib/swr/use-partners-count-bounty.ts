import { useMemo } from "react";
import { BountyProps } from "../types";
import usePartnersCount from "./use-partners-count";

export function usePartnersCountBounty({ bounty }: { bounty?: BountyProps }) {
  const { partnersCount: groupCount, loading } = usePartnersCount<
    | {
        groupId: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "groupId",
  });

  const totalPartnersForBounty = useMemo(() => {
    if (!bounty || bounty.groups.length === 0) {
      // if no groups set, return all partners
      return groupCount?.reduce((acc, curr) => acc + curr._count, 0) ?? 0;
    }

    return (
      groupCount?.reduce((acc, curr) => {
        if (bounty.groups.some((group) => group.id === curr.groupId)) {
          return acc + curr._count;
        }
        return acc;
      }, 0) ?? 0
    );
  }, [groupCount, bounty]);

  return { totalPartnersForBounty, loading };
}
