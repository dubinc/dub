import {
  buildMilestonesCommissionDescription,
  getPendingSocialMetricsMilestones,
  getSocialMetricsEarningCap,
  getSocialMetricsMilestoneStatus,
  getSocialMetricsMilestones,
  getVisibleSocialMetricsMilestones,
  groupSocialMetricsMilestones,
  hasReachedSocialMetricsEarningCap,
  isSocialMetricsMilestoneApproved,
} from "@/lib/bounty/social-metrics-milestones";
import { describe, expect, it } from "vitest";

const baseBounty = {
  rewardAmount: 25_000,
  submissionRequirements: {
    socialMetrics: {
      platform: "youtube",
      metric: "views",
      minCount: 1000,
    },
  },
};

const bonusBounty = {
  rewardAmount: 25_000,
  submissionRequirements: {
    socialMetrics: {
      platform: "youtube",
      metric: "views",
      minCount: 1000,
      incrementalBonus: {
        incrementCount: 1000,
        bonusPerIncrement: 1000,
        maxCount: 6000,
      },
    },
  },
};

describe("groupSocialMetricsMilestones", () => {
  it("keeps the base milestone separate and merges repeated bonus milestones", () => {
    expect(
      groupSocialMetricsMilestones(getSocialMetricsMilestones(bonusBounty)),
    ).toEqual([
      {
        fromThreshold: 0,
        threshold: 1000,
        rewardAmount: 25_000,
        count: 1,
        totalRewardAmount: 25_000,
      },
      {
        fromThreshold: 1000,
        threshold: 6000,
        rewardAmount: 1000,
        count: 5,
        totalRewardAmount: 5000,
      },
    ]);
  });

  it("returns an empty list for no milestones", () => {
    expect(groupSocialMetricsMilestones([])).toEqual([]);
  });
});

describe("getSocialMetricsMilestones", () => {
  it("returns only the base milestone without a variable bonus", () => {
    expect(getSocialMetricsMilestones(baseBounty)).toEqual([
      { fromThreshold: 0, threshold: 1000, rewardAmount: 25_000 },
    ]);
  });

  it("returns every bonus milestone up to the max count", () => {
    const milestones = getSocialMetricsMilestones(bonusBounty);

    expect(milestones.map((m) => m.threshold)).toEqual([
      1000, 2000, 3000, 4000, 5000, 6000,
    ]);
    expect(milestones[1]).toEqual({
      fromThreshold: 1000,
      threshold: 2000,
      rewardAmount: 1000,
    });
  });
});

describe("getSocialMetricsEarningCap", () => {
  it("is the min count without a variable bonus", () => {
    expect(getSocialMetricsEarningCap(baseBounty)).toBe(1000);
  });

  it("is the last bonus milestone with a variable bonus", () => {
    expect(getSocialMetricsEarningCap(bonusBounty)).toBe(6000);
  });

  it("is null for bounties without social metrics", () => {
    expect(
      getSocialMetricsEarningCap({
        rewardAmount: 100,
        submissionRequirements: null,
      }),
    ).toBeNull();
  });
});

describe("hasReachedSocialMetricsEarningCap", () => {
  it("is false below the cap and true at or above it", () => {
    expect(
      hasReachedSocialMetricsEarningCap({
        bounty: bonusBounty,
        submission: { socialMetricCount: 5999 },
      }),
    ).toBe(false);
    expect(
      hasReachedSocialMetricsEarningCap({
        bounty: bonusBounty,
        submission: { socialMetricCount: 6000 },
      }),
    ).toBe(true);
  });
});

describe("getPendingSocialMetricsMilestones", () => {
  it("returns nothing before the min count is reached", () => {
    expect(
      getPendingSocialMetricsMilestones({
        bounty: baseBounty,
        submission: {
          socialMetricCount: 999,
          approvedSocialMetricThreshold: null,
        },
      }),
    ).toEqual([]);
  });

  it("returns every reached milestone when nothing has been approved", () => {
    const pending = getPendingSocialMetricsMilestones({
      bounty: bonusBounty,
      submission: {
        socialMetricCount: 5500,
        approvedSocialMetricThreshold: null,
      },
    });

    expect(pending.map((m) => m.threshold)).toEqual([
      1000, 2000, 3000, 4000, 5000,
    ]);
  });

  it("skips milestones at or under the approved threshold", () => {
    const pending = getPendingSocialMetricsMilestones({
      bounty: bonusBounty,
      submission: {
        socialMetricCount: 6200,
        approvedSocialMetricThreshold: 5000,
      },
    });

    expect(pending.map((m) => m.threshold)).toEqual([6000]);
  });
});

describe("isSocialMetricsMilestoneApproved", () => {
  it("uses the approved threshold when it is set", () => {
    const submission = {
      status: "submitted" as const,
      socialMetricCount: 5500,
      approvedSocialMetricThreshold: 3000,
    };

    expect(
      isSocialMetricsMilestoneApproved({
        milestone: { threshold: 3000 },
        submission,
      }),
    ).toBe(true);
    expect(
      isSocialMetricsMilestoneApproved({
        milestone: { threshold: 4000 },
        submission,
      }),
    ).toBe(false);
  });

  it("treats every reached tier as approved for legacy approved submissions", () => {
    const submission = {
      status: "approved" as const,
      socialMetricCount: 3500,
      approvedSocialMetricThreshold: null,
    };

    expect(
      isSocialMetricsMilestoneApproved({
        milestone: { threshold: 3000 },
        submission,
      }),
    ).toBe(true);
    expect(
      isSocialMetricsMilestoneApproved({
        milestone: { threshold: 4000 },
        submission,
      }),
    ).toBe(false);
  });
});

describe("getVisibleSocialMetricsMilestones", () => {
  it("keeps approved milestones reached even if the live count drops", () => {
    const milestones = getVisibleSocialMetricsMilestones({
      bounty: bonusBounty,
      submission: {
        socialMetricCount: 1500,
        approvedSocialMetricThreshold: 3000,
      },
    });

    expect(milestones.map((m) => [m.threshold, m.reached])).toEqual([
      [1000, true],
      [2000, true],
      [3000, true],
      [4000, false],
    ]);
  });
});

describe("getSocialMetricsMilestoneStatus", () => {
  const statusesFor = (submission: {
    status: "submitted" | "approved" | "rejected";
    socialMetricCount: number;
    approvedSocialMetricThreshold: number | null;
  }) =>
    getVisibleSocialMetricsMilestones({ bounty: bonusBounty, submission }).map(
      (milestone) => getSocialMetricsMilestoneStatus({ milestone, submission }),
    );

  it("splits approved, pending, and in-progress milestones", () => {
    expect(
      statusesFor({
        status: "submitted",
        socialMetricCount: 3500,
        approvedSocialMetricThreshold: 2000,
      }),
    ).toEqual(["approved", "approved", "pending", "inProgress"]);
  });

  it("marks unpaid reached milestones as rejected on rejected submissions", () => {
    expect(
      statusesFor({
        status: "rejected",
        socialMetricCount: 2500,
        approvedSocialMetricThreshold: 1000,
      }),
    ).toEqual(["approved", "rejected", "inProgress"]);
  });
});

describe("getSocialMetricsCommissionDescription", () => {
  it("describes the milestone range", () => {
    expect(
      buildMilestonesCommissionDescription({
        bountyName: "June launch",
        metric: "views",
        milestone: { fromThreshold: 1000, threshold: 2000 },
      }),
    ).toBe(
      'Commission for growing from 1,000 to 2,000 views on "June launch" bounty.',
    );
  });

  it("describes a range starting at zero as reaching the target", () => {
    expect(
      buildMilestonesCommissionDescription({
        bountyName: "B2",
        metric: "views",
        milestone: { fromThreshold: 0, threshold: 17000 },
      }),
    ).toBe('Commission for reaching 17,000 views on "B2" bounty.');
  });

  it("falls back when the bounty has no name", () => {
    expect(
      buildMilestonesCommissionDescription({
        bountyName: null,
        metric: "likes",
        milestone: { fromThreshold: 0, threshold: 500 },
      }),
    ).toBe("Commission for reaching 500 likes on the bounty.");
  });
});
