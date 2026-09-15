import {
  formatRewardConditionClause,
  formatRewardConditionParts,
} from "@/lib/rewards/format-reward-condition";
import { describe, expect, test } from "vitest";

describe("formatRewardConditionParts", () => {
  test("formats country names", () => {
    expect(
      formatRewardConditionParts({
        event: "sale",
        condition: {
          entity: "customer",
          attribute: "country",
          operator: "equals_to",
          value: "US",
        },
      }),
    ).toEqual({
      entityLabel: "Customer",
      attributeLabel: "Country",
      operatorLabel: "is",
      valueLabel: "United States",
    });
  });

  test("uses product label with is operator", () => {
    expect(
      formatRewardConditionParts({
        event: "sale",
        condition: {
          entity: "sale",
          attribute: "productId",
          operator: "in",
          value: ["prod_a", "prod_b"],
          label: "Premium Plan",
        },
      }),
    ).toEqual({
      entityLabel: "Sale",
      attributeLabel: "Product ID",
      operatorLabel: "is",
      valueLabel: "Premium Plan",
    });
  });

  test("formats metadata field names", () => {
    expect(
      formatRewardConditionParts({
        event: "sale",
        condition: {
          entity: "sale",
          attribute: "metadata",
          operator: "equals_to",
          value: "enterprise",
          metadataField: "plan",
        },
      }),
    ).toEqual({
      entityLabel: "Sale",
      attributeLabel: '"plan"',
      operatorLabel: "is",
      valueLabel: "enterprise",
    });
  });

  test("formats currency values", () => {
    expect(
      formatRewardConditionParts({
        event: "sale",
        condition: {
          entity: "sale",
          attribute: "amount",
          operator: "greater_than_or_equal",
          value: 20000,
        },
      }),
    ).toEqual({
      entityLabel: "Sale",
      attributeLabel: "Amount",
      operatorLabel: "is greater than or equal to",
      valueLabel: "$200.00",
    });
  });
});

describe("formatRewardConditionClause", () => {
  test("joins parts with if/and conjunctions", () => {
    expect(
      formatRewardConditionClause({
        event: "sale",
        operator: "AND",
        isFirst: true,
        condition: {
          entity: "customer",
          attribute: "country",
          operator: "equals_to",
          value: "US",
        },
      }),
    ).toBe("if Customer Country is United States");

    expect(
      formatRewardConditionClause({
        event: "sale",
        operator: "AND",
        isFirst: false,
        condition: {
          entity: "sale",
          attribute: "productId",
          operator: "equals_to",
          value: "prod_premium",
          label: "Premium Plan",
        },
      }),
    ).toBe("and Sale Product ID is Premium Plan");
  });
});
