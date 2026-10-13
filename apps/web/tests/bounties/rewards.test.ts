import {
  formatBountyRewardAmount,
  getBountyRewardAmount,
  getBountyRewardDescription,
} from "@/lib/bounty/rewards";
import { describe, expect, it } from "vitest";

const fixedBounty = {
  rewardAmount: 5_000,
  rewardDescription: null,
  submissionRequirements: null,
};

// $250 base, plus $10 for each 1,000 views between 1,000 and 6,000 views
const bonusBounty = {
  rewardAmount: 25_000,
  rewardDescription: null,
  submissionRequirements: {
    socialMetrics: {
      platform: "youtube" as const,
      metric: "views" as const,
      minCount: 1000,
      incrementalBonus: {
        incrementCount: 1000,
        bonusPerIncrement: 1000,
        maxCount: 6000,
      },
    },
  },
};

const customBounty = {
  rewardAmount: null,
  rewardDescription: "A free product",
  submissionRequirements: null,
};

describe("getBountyRewardAmount", () => {
  it("returns the fixed reward", () => {
    expect(getBountyRewardAmount(fixedBounty)).toEqual({
      amount: 5_000,
      isMaximum: false,
    });
  });

  it("returns the cap of a bounty with an incremental bonus as a maximum", () => {
    expect(getBountyRewardAmount(bonusBounty)).toEqual({
      amount: 30_000,
      isMaximum: true,
    });
  });

  it("returns null for a bounty without an amount", () => {
    expect(getBountyRewardAmount(customBounty)).toBeNull();
  });
});

describe("formatBountyRewardAmount", () => {
  it("formats a fixed amount", () => {
    expect(formatBountyRewardAmount({ amount: 5_000, isMaximum: false })).toBe(
      "$50",
    );
  });

  it("formats a maximum amount", () => {
    expect(formatBountyRewardAmount({ amount: 30_000, isMaximum: true })).toBe(
      "Up to $300",
    );
  });

  it("adds the prefix", () => {
    expect(
      formatBountyRewardAmount(
        { amount: 30_000, isMaximum: true },
        { prefix: "Earn" },
      ),
    ).toBe("Earn up to $300");
  });
});

describe("getBountyRewardDescription", () => {
  it("describes each kind of reward", () => {
    expect(getBountyRewardDescription(fixedBounty)).toBe("Earn $50");
    expect(getBountyRewardDescription(bonusBounty)).toBe("Earn up to $300");
    expect(getBountyRewardDescription(customBounty)).toBe("A free product");
  });
});
