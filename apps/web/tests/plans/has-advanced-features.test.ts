import {
  leftAdvancedPlan,
  wouldLoseAdvancedRewardLogic,
} from "@/lib/plans/has-advanced-features";
import { describe, expect, it } from "vitest";

describe("wouldLoseAdvancedRewardLogic", () => {
  it("is false when staying on Advanced", () => {
    expect(
      wouldLoseAdvancedRewardLogic({
        currentPlan: "advanced",
        newPlan: "advanced",
      }),
    ).toBe(false);
  });

  it("is true when downgrading from Advanced to Business", () => {
    expect(
      wouldLoseAdvancedRewardLogic({
        currentPlan: "advanced",
        newPlan: "business",
      }),
    ).toBe(true);
  });

  it("is true when downgrading from Enterprise to Pro", () => {
    expect(
      wouldLoseAdvancedRewardLogic({
        currentPlan: "enterprise",
        newPlan: "pro",
      }),
    ).toBe(true);
  });

  it("is false when upgrading from Pro to Advanced", () => {
    expect(
      wouldLoseAdvancedRewardLogic({
        currentPlan: "pro",
        newPlan: "advanced",
      }),
    ).toBe(false);
  });
});

describe("leftAdvancedPlan", () => {
  it("is true only when leaving Advanced for another plan", () => {
    expect(
      leftAdvancedPlan({
        currentPlan: "advanced",
        newPlan: "business",
      }),
    ).toBe(true);
  });

  it("is false when leaving Enterprise", () => {
    expect(
      leftAdvancedPlan({
        currentPlan: "enterprise",
        newPlan: "business",
      }),
    ).toBe(false);
  });

  it("is false when staying on Advanced", () => {
    expect(
      leftAdvancedPlan({
        currentPlan: "advanced",
        newPlan: "advanced",
      }),
    ).toBe(false);
  });
});
