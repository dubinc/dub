import { getRewardMaxDurationForContext } from "@/lib/partners/determine-partner-reward";
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const RECURRING_PRODUCT_ID = "prod_recurring";

const modifiers = [
  {
    id: "amount-below-threshold",
    type: "flat" as const,
    operator: "AND" as const,
    conditions: [
      {
        value: 2000,
        entity: "sale" as const,
        operator: "less_than" as const,
        attribute: "amount" as const,
      },
    ],
    maxDuration: 0,
    amountInCents: 0,
  },
  {
    id: "recurring-product",
    type: "percentage" as const,
    operator: "AND" as const,
    conditions: [
      {
        value: RECURRING_PRODUCT_ID,
        entity: "sale" as const,
        operator: "equals_to" as const,
        attribute: "productId" as const,
      },
    ],
    maxDuration: null,
    amountInPercentage: 40,
  },
];

const oneTimeReward = {
  maxDuration: 0,
  modifiers: null,
};

const rewardWithModifiers = {
  maxDuration: 0,
  modifiers,
};

function shouldSkipForOriginalOneTimeReward(maxDuration: number | null) {
  return typeof maxDuration === "number" && maxDuration === 0;
}

describe("getRewardMaxDurationForContext", () => {
  test("returns row maxDuration when there are no modifiers", () => {
    expect(
      getRewardMaxDurationForContext({
        reward: oneTimeReward,
        context: { sale: { amount: 3000 } },
      }),
    ).toBe(0);
  });

  test("returns row maxDuration when context is missing", () => {
    expect(
      getRewardMaxDurationForContext({
        reward: rewardWithModifiers,
      }),
    ).toBe(0);
  });

  test("returns lifetime maxDuration when a matching modifier overrides it", () => {
    expect(
      getRewardMaxDurationForContext({
        reward: rewardWithModifiers,
        context: {
          sale: {
            amount: 847,
            productId: RECURRING_PRODUCT_ID,
          },
        },
      }),
    ).toBeNull();
  });

  test("returns row maxDuration when no modifier matches", () => {
    expect(
      getRewardMaxDurationForContext({
        reward: rewardWithModifiers,
        context: {
          sale: { amount: 3000 },
        },
      }),
    ).toBe(0);
  });

  test("returns the matched one-time modifier for a sale below the amount threshold", () => {
    expect(
      getRewardMaxDurationForContext({
        reward: rewardWithModifiers,
        context: {
          sale: { amount: 500 },
        },
      }),
    ).toBe(0);
  });
});

describe("original-reward skip after a reward ID change", () => {
  test("plain one-time original reward still skips a later sale", () => {
    const originalMaxDuration = getRewardMaxDurationForContext({
      reward: oneTimeReward,
      context: { sale: { amount: 1000 } },
    });

    expect(originalMaxDuration).toBe(0);
    expect(shouldSkipForOriginalOneTimeReward(originalMaxDuration)).toBe(true);
  });

  test("does not skip when the original reward resolves to a lifetime maxDuration", () => {
    const originalMaxDuration = getRewardMaxDurationForContext({
      reward: rewardWithModifiers,
      context: {
        sale: {
          amount: 847,
          productId: RECURRING_PRODUCT_ID,
        },
      },
    });

    expect(originalMaxDuration).toBeNull();
    expect(shouldSkipForOriginalOneTimeReward(originalMaxDuration)).toBe(false);
  });

  test("still skips when the original reward resolves to a one-time maxDuration", () => {
    const originalMaxDuration = getRewardMaxDurationForContext({
      reward: rewardWithModifiers,
      context: {
        sale: { amount: 3000 },
      },
    });

    expect(originalMaxDuration).toBe(0);
    expect(shouldSkipForOriginalOneTimeReward(originalMaxDuration)).toBe(true);
  });
});
