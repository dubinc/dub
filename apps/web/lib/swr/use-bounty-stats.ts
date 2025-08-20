import { useParams } from "next/navigation";
import { useMemo } from "react";
import useBountiesStats from "./use-bounties-stats";

export default function useBountyStats() {
  const { bountiesStats } = useBountiesStats();
  const { bountyId } = useParams<{ bountyId: string }>();

  const bountyStats = useMemo(() => {
    return bountiesStats?.find((bounty) => bounty.id === bountyId);
  }, [bountiesStats, bountyId]);

  return {
    bountyStats,
  };
}
