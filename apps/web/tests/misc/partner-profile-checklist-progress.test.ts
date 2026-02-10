import {
  EXCLUDED_PROGRAM_IDS,
  PARTNER_NETWORK_MIN_COMMISSIONS_CENTS,
} from "@/lib/constants/partner-profile";
import { getPartnerProfileChecklistProgress } from "@/lib/network/get-discoverability-requirements";
import { describe, expect, it } from "vitest";

type ChecklistInput = Parameters<typeof getPartnerProfileChecklistProgress>[0];

const basePartner: ChecklistInput["partner"] = {
  image: null,
  description: null,
  monthlyTraffic: null,
  preferredEarningStructures: [],
  salesChannels: [],
  platforms: [],
};

const completedPartner: ChecklistInput["partner"] = {
  ...basePartner,
  image: "https://example.com/logo.png",
  description: "Creator profile",
  monthlyTraffic: "OneHundredThousandPlus",
  preferredEarningStructures: ["Per_Sale"],
  salesChannels: ["Blogs"],
  platforms: [
    {
      type: "website",
      identifier: "https://example.com",
      verifiedAt: new Date(),
      platformId: null,
      subscribers: BigInt(0),
      posts: BigInt(0),
      views: BigInt(0),
    },
    {
      type: "youtube",
      identifier: "UC1234567890",
      verifiedAt: new Date(),
      platformId: null,
      subscribers: BigInt(0),
      posts: BigInt(0),
      views: BigInt(0),
    },
  ],
};

describe("getPartnerProfileChecklistProgress", () => {
  it("returns incomplete progress for an incomplete profile", () => {
    const result = getPartnerProfileChecklistProgress({
      partner: basePartner,
      programEnrollments: [],
    });

    expect(result.isComplete).toBe(false);
    expect(result.completedCount).toBeLessThan(result.totalCount);
  });

  it("returns complete progress when all checklist tasks are complete", () => {
    const result = getPartnerProfileChecklistProgress({
      partner: completedPartner,
      programEnrollments: [
        {
          programId: "prog_non_excluded",
          status: "approved",
          totalCommissions: PARTNER_NETWORK_MIN_COMMISSIONS_CENTS,
        },
      ],
    });

    expect(result.isComplete).toBe(true);
    expect(result.completedCount).toBe(result.totalCount);
    expect(result.completedCount).toBe(8);
  });

  it("handles the excluded-program edge case consistently", () => {
    expect(EXCLUDED_PROGRAM_IDS.length).toBeGreaterThan(0);

    const result = getPartnerProfileChecklistProgress({
      partner: completedPartner,
      programEnrollments: [
        {
          programId: EXCLUDED_PROGRAM_IDS[0],
          status: "approved",
          totalCommissions: PARTNER_NETWORK_MIN_COMMISSIONS_CENTS,
        },
      ],
    });

    expect(result.isComplete).toBe(false);
    expect(result.completedCount).toBe(7);
  });
});
