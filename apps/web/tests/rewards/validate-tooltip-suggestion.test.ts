import type {
  ReviewRewardTooltipModifier,
  TooltipSuggestion,
} from "@/lib/ai/review-reward-tooltip-schema";
import {
  applyTooltipSuggestion,
  filterValidatedTooltipSuggestions,
  getTooltipSuggestionPages,
  isRewardConditionComplete,
  suggestionTouchesField,
} from "@/lib/rewards/validate-tooltip-suggestion";
import { describe, expect, test } from "vitest";

const saleAmountModifiers: ReviewRewardTooltipModifier[] = [
  {
    operator: "AND",
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
  suggested: {
    operator: "greater_than_or_equal" as const,
  },
};

function accepted(suggestion: TooltipSuggestion = minTwentySuggestion) {
  return filterValidatedTooltipSuggestions({
    event: "sale",
    modifiers: saleAmountModifiers,
    suggestions: [suggestion],
  });
}

describe("isRewardConditionComplete", () => {
  test("requires entity, attribute, operator, and value", () => {
    expect(
      isRewardConditionComplete({
        event: "sale",
        condition: {
          entity: "sale",
          attribute: "amount",
          operator: "greater_than",
        },
      }),
    ).toBe(false);

    expect(
      isRewardConditionComplete({
        event: "sale",
        condition: {
          entity: "sale",
          attribute: "amount",
          operator: "greater_than",
          value: 20,
        },
      }),
    ).toBe(true);
  });

  test("requires a metadata field name", () => {
    expect(
      isRewardConditionComplete({
        event: "sale",
        condition: {
          entity: "sale",
          attribute: "metadata",
          operator: "equals_to",
          value: "enterprise",
        },
      }),
    ).toBe(false);

    expect(
      isRewardConditionComplete({
        event: "sale",
        condition: {
          entity: "sale",
          attribute: "metadata",
          operator: "equals_to",
          value: "enterprise",
          metadataField: "plan",
        },
      }),
    ).toBe(true);
  });

  test("rejects empty arrays and NaN", () => {
    expect(
      isRewardConditionComplete({
        event: "sale",
        condition: {
          entity: "customer",
          attribute: "country",
          operator: "in",
          value: [],
        },
      }),
    ).toBe(false);

    expect(
      isRewardConditionComplete({
        event: "sale",
        condition: {
          entity: "sale",
          attribute: "amount",
          operator: "greater_than",
          value: Number.NaN,
        },
      }),
    ).toBe(false);
  });
});

describe("filterValidatedTooltipSuggestions", () => {
  test("accepts a high-confidence operator fix on an existing condition", () => {
    expect(accepted()).toEqual([minTwentySuggestion]);
  });

  test("rejects confidence below the 0.5 floor", () => {
    expect(accepted({ ...minTwentySuggestion, confidence: 0.49 })).toEqual([]);
  });

  test("rejects unknown condition indexes", () => {
    expect(accepted({ ...minTwentySuggestion, conditionIndex: 1 })).toEqual([]);
  });

  test("rejects operators that are not allowed for the attribute", () => {
    expect(
      accepted({
        ...minTwentySuggestion,
        suggested: { operator: "contains" },
      }),
    ).toEqual([]);
  });

  test("rejects a no-op that matches the current condition", () => {
    expect(
      accepted({
        ...minTwentySuggestion,
        suggested: { operator: "greater_than" },
      }),
    ).toEqual([]);
  });

  test("rejects a value whose shape does not match the operator", () => {
    expect(
      accepted({
        ...minTwentySuggestion,
        suggested: { operator: "in", value: 20 },
      }),
    ).toEqual([]);
  });

  test("rejects customer.source operator changes", () => {
    expect(
      filterValidatedTooltipSuggestions({
        event: "sale",
        modifiers: [
          {
            operator: "AND",
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
        suggestions: [
          {
            ...minTwentySuggestion,
            suggested: { operator: "not_equals" },
          },
        ],
      }),
    ).toEqual([]);
  });

  test("keeps the higher-confidence suggestion per condition", () => {
    const result = filterValidatedTooltipSuggestions({
      event: "sale",
      modifiers: saleAmountModifiers,
      suggestions: [
        { ...minTwentySuggestion, confidence: 0.6 },
        {
          ...minTwentySuggestion,
          confidence: 0.95,
          suggested: { operator: "greater_than_or_equal", value: 20 },
        },
        { ...minTwentySuggestion, confidence: 0.2 },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.95);
    expect(result[0].suggested.value).toBe(20);
  });
});

describe("applyTooltipSuggestion", () => {
  test("writes only the patched fields", () => {
    expect(
      applyTooltipSuggestion(saleAmountModifiers[0].conditions[0], {
        operator: "greater_than_or_equal",
      }),
    ).toEqual({
      entity: "sale",
      attribute: "amount",
      operator: "greater_than_or_equal",
      value: 20,
    });
  });
});

describe("getTooltipSuggestionPages", () => {
  test("splits one suggestion that changes operator and value into two pages", () => {
    const pages = getTooltipSuggestionPages({
      modifiers: saleAmountModifiers,
      suggestions: [
        {
          ...minTwentySuggestion,
          suggested: { operator: "greater_than_or_equal", value: 25 },
        },
      ],
    });

    expect(pages.map((page) => page.field)).toEqual(["operator", "value"]);
  });

  test("keeps one page when only the operator changes", () => {
    expect(
      getTooltipSuggestionPages({
        modifiers: saleAmountModifiers,
        suggestions: [minTwentySuggestion],
      }),
    ).toHaveLength(1);
  });
});

describe("suggestionTouchesField", () => {
  test("detects operator vs value changes", () => {
    const current = saleAmountModifiers[0].conditions[0];

    expect(
      suggestionTouchesField({
        field: "operator",
        current,
        suggested: { operator: "greater_than_or_equal" },
      }),
    ).toBe(true);
    expect(
      suggestionTouchesField({
        field: "value",
        current,
        suggested: { operator: "greater_than_or_equal" },
      }),
    ).toBe(false);
    expect(
      suggestionTouchesField({
        field: "value",
        current,
        suggested: { value: 25 },
      }),
    ).toBe(true);
  });
});
