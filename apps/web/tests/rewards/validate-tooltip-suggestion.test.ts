import {
  reviewRewardTooltipInputSchema,
  type PayoutFix,
  type ReviewRewardTooltipModifier,
  type RewardPayout,
  type TooltipSuggestion,
} from "@/lib/ai/review-reward-tooltip-schema";
import {
  filterPayoutFixes,
  filterValidatedTooltipSuggestions,
  getTooltipSuggestionPages,
  isRewardConditionComplete,
} from "@/lib/rewards/validate-tooltip-suggestion";
import { describe, expect, test } from "vitest";

const saleAmountModifiers: ReviewRewardTooltipModifier[] = [
  {
    operator: "AND",
    payout: { type: "flat", amount: 10, maxDuration: 0 },
    conditions: [
      {
        entity: "sale",
        attribute: "amount",
        operator: "greater_than",
        value: 20,
      },
    ],
  },
];

const minTwentySuggestion: TooltipSuggestion = {
  modifierIndex: 0,
  conditionIndex: 0,
  confidence: 0.9,
  reason:
    '"Minimum $20 deposit" implies $20 qualifies, but "is greater than" excludes it.',
  suggested: { operator: "greater_than_or_equal" },
};

describe("isRewardConditionComplete", () => {
  test.each([
    [{ entity: "sale", attribute: "amount", operator: "greater_than" }, false],
    [
      {
        entity: "sale",
        attribute: "amount",
        operator: "greater_than",
        value: 20,
      },
      true,
    ],
    [
      {
        entity: "sale",
        attribute: "metadata",
        operator: "equals_to",
        value: "enterprise",
      },
      false,
    ],
    [
      {
        entity: "sale",
        attribute: "metadata",
        operator: "equals_to",
        value: "enterprise",
        metadataField: "plan",
      },
      true,
    ],
    [
      { entity: "customer", attribute: "country", operator: "in", value: [] },
      false,
    ],
    [
      {
        entity: "sale",
        attribute: "amount",
        operator: "greater_than",
        value: Number.NaN,
      },
      false,
    ],
  ])("%o -> %s", (condition, expected) => {
    expect(isRewardConditionComplete({ event: "sale", condition })).toBe(
      expected,
    );
  });
});

describe("filterValidatedTooltipSuggestions", () => {
  const filter = (
    suggestions: TooltipSuggestion[],
    modifiers = saleAmountModifiers,
  ) =>
    filterValidatedTooltipSuggestions({
      event: "sale",
      modifiers,
      suggestions,
    });

  test("accepts a high-confidence fix on an existing condition", () => {
    expect(filter([minTwentySuggestion])).toEqual([minTwentySuggestion]);
  });

  test.each<[string, Partial<TooltipSuggestion>]>([
    ["low confidence", { confidence: 0.49 }],
    ["unknown condition index", { conditionIndex: 1 }],
    [
      "operator not allowed for the attribute",
      { suggested: { operator: "contains" } },
    ],
    ["no-op", { suggested: { operator: "greater_than" } }],
    ["value shape mismatch", { suggested: { operator: "in", value: 20 } }],
  ])("rejects %s", (_, override) => {
    expect(filter([{ ...minTwentySuggestion, ...override }])).toEqual([]);
  });

  test("rejects operator changes on customer.source", () => {
    expect(
      filter(
        [{ ...minTwentySuggestion, suggested: { operator: "not_equals" } }],
        [
          {
            ...saleAmountModifiers[0],
            conditions: [
              {
                entity: "customer",
                attribute: "source",
                operator: "equals_to",
                value: "tracked",
              },
            ],
          },
        ],
      ),
    ).toEqual([]);
  });

  test("keeps the higher-confidence suggestion per condition", () => {
    const result = filter([
      { ...minTwentySuggestion, confidence: 0.6 },
      {
        ...minTwentySuggestion,
        confidence: 0.95,
        suggested: { operator: "greater_than_or_equal", value: 25 },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.95);
  });
});

describe("getTooltipSuggestionPages", () => {
  test("creates one page per changed field", () => {
    const pages = (suggested: TooltipSuggestion["suggested"]) =>
      getTooltipSuggestionPages({
        modifiers: saleAmountModifiers,
        suggestions: [{ ...minTwentySuggestion, suggested }],
      }).map((page) => page.field);

    expect(pages({ operator: "greater_than_or_equal" })).toEqual(["operator"]);
    expect(pages({ operator: "greater_than_or_equal", value: 25 })).toEqual([
      "operator",
      "value",
    ]);
  });
});

describe("filterPayoutFixes", () => {
  const flatBase: RewardPayout = { type: "flat", amount: 10, maxDuration: 0 };
  const percentageGroup: ReviewRewardTooltipModifier[] = [
    {
      ...saleAmountModifiers[0],
      payout: { type: "percentage", amount: 20, maxDuration: null },
    },
  ];
  const fix: PayoutFix = {
    scope: "default",
    amount: 300,
    confidence: 0.9,
    reason: 'Copy says "earn $300" but the payout is $10.',
  };

  test("keeps a valid fix", () => {
    expect(
      filterPayoutFixes({ basePayout: flatBase, modifiers: [], fixes: [fix] }),
    ).toHaveLength(1);
  });

  test("drops a duration-only fix for a click reward", () => {
    expect(
      filterPayoutFixes({
        event: "click",
        basePayout: flatBase,
        modifiers: [],
        fixes: [{ ...fix, amount: undefined, maxDuration: 3 }],
      }),
    ).toEqual([]);
  });

  test.each<[string, PayoutFix]>([
    ["a no-op", { ...fix, amount: 10 }],
    ["a flat amount over the save limit", { ...fix, amount: 1_000_000 }],
    [
      "a percentage over 100",
      { ...fix, scope: "group", modifierIndex: 0, amount: 150 },
    ],
  ])("drops %s", (_, payoutFix) => {
    expect(
      filterPayoutFixes({
        basePayout: flatBase,
        modifiers: percentageGroup,
        fixes: [payoutFix],
      }),
    ).toEqual([]);
  });
});

test("reviewRewardTooltipInputSchema rejects more than 20 modifiers", () => {
  const input = {
    workspaceId: "ws_123",
    event: "sale",
    tooltip: "Earn $10 on every sale over $20",
    basePayout: { type: "flat", amount: 10, maxDuration: 0 },
    modifiers: saleAmountModifiers,
  };

  expect(reviewRewardTooltipInputSchema.safeParse(input).success).toBe(true);
  expect(
    reviewRewardTooltipInputSchema.safeParse({
      ...input,
      modifiers: Array(21).fill(saleAmountModifiers[0]),
    }).success,
  ).toBe(false);
});
