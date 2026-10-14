import { PartnerBountyProps } from "@/lib/types";

export const PARTNER_BOUNTY_TABS = ["active", "completed", "expired"] as const;

export type PartnerBountyTab = (typeof PARTNER_BOUNTY_TABS)[number];

// the partner reached the goal: the performance target, or the maximum number of submissions (drafts do not count)
function isPartnerBountyCompleted(
  bounty: Pick<
    PartnerBountyProps,
    "type" | "submissions" | "performanceCondition" | "maxSubmissions"
  >,
) {
  if (bounty.type === "performance") {
    // a performance bounty without a condition has no target to reach, but a target of 0 is valid
    return (
      bounty.performanceCondition != null &&
      (bounty.submissions?.[0]?.performanceCount ?? 0) >=
        bounty.performanceCondition.value
    );
  }

  return (
    (bounty.submissions?.filter((s) => s.status !== "draft").length ?? 0) >=
    (bounty.maxSubmissions ?? 1)
  );
}

export function isPartnerBountyExpired(
  bounty: Pick<PartnerBountyProps, "endsAt">,
) {
  return !!bounty.endsAt && new Date(bounty.endsAt) < new Date();
}

// a completed bounty stays in Completed after it ends, so Expired only has bounties the partner did not complete
export function getPartnerBountyTab(
  bounty: PartnerBountyProps,
): PartnerBountyTab {
  if (isPartnerBountyCompleted(bounty)) {
    return "completed";
  }

  return isPartnerBountyExpired(bounty) ? "expired" : "active";
}

export function countPartnerBountiesByTab(
  bounties: PartnerBountyProps[] | undefined,
) {
  const counts: Record<PartnerBountyTab, number> = {
    active: 0,
    completed: 0,
    expired: 0,
  };

  for (const bounty of bounties ?? []) {
    counts[getPartnerBountyTab(bounty)]++;
  }

  return counts;
}
