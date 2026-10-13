import { PartnerBountyProps } from "@/lib/types";

export const PARTNER_BOUNTY_TABS = ["active", "completed", "expired"] as const;

export type PartnerBountyTab = (typeof PARTNER_BOUNTY_TABS)[number];

// the partner reached the goal: the performance target, or the maximum number of submissions (drafts do not count)
export function isPartnerBountyCompleted(bounty: PartnerBountyProps) {
  return bounty.type === "performance"
    ? (bounty.submissions?.[0]?.performanceCount ?? 0) >=
        (bounty.performanceCondition?.value ?? 0)
    : (bounty.submissions?.filter((s) => s.status !== "draft").length ?? 0) >=
        (bounty.maxSubmissions ?? 1);
}

export function isPartnerBountyExpired(bounty: PartnerBountyProps) {
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
