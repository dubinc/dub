import { PartnerBountyTab } from "@/lib/bounty/partner-bounty-tabs";

interface PartnerBountyTabConfig {
  label: string;
  showCount: boolean;
  badgeClassName?: string;
  resourceName: { singular: string; plural: string };
  emptyState: {
    title: string;
    description: string;
    // the description on the bounties page of all programs, when it differs
    allProgramsDescription?: string;
    showLearnMore: boolean;
  };
}

export const PARTNER_BOUNTY_TAB_CONFIG: Record<
  PartnerBountyTab,
  PartnerBountyTabConfig
> = {
  active: {
    label: "Active",
    showCount: true,
    resourceName: { singular: "active bounty", plural: "active bounties" },
    emptyState: {
      title: "No bounties to collect",
      description: "This program isn't offering any bounties at the moment.",
      allProgramsDescription:
        "Your programs aren't offering any bounties at the moment.",
      showLearnMore: true,
    },
  },
  completed: {
    label: "Completed",
    showCount: true,
    badgeClassName: "bg-green-600",
    resourceName: {
      singular: "completed bounty",
      plural: "completed bounties",
    },
    emptyState: {
      title: "No completed bounties",
      description: "Bounties you complete appear here.",
      showLearnMore: false,
    },
  },
  expired: {
    label: "Expired",
    // no count for Expired, as in the design
    showCount: false,
    resourceName: { singular: "expired bounty", plural: "expired bounties" },
    emptyState: {
      title: "No expired bounties",
      description: "Bounties that ended before you completed them appear here.",
      showLearnMore: false,
    },
  },
};
