import { buildCommissionDescription } from "@/lib/commissions/build-commission-description";
import { RewardConditions, RewardProps } from "@/lib/types";
import { describe, expect, test } from "vitest";

function saleReward(
  overrides: Partial<
    Pick<
      RewardProps,
      | "event"
      | "type"
      | "amountInCents"
      | "amountInPercentage"
      | "maxDuration"
      | "description"
      | "spendLimitAmount"
      | "spendLimitInterval"
    >
  > = {},
): Pick<
  RewardProps,
  | "event"
  | "type"
  | "amountInCents"
  | "amountInPercentage"
  | "maxDuration"
  | "description"
  | "spendLimitAmount"
  | "spendLimitInterval"
> {
  return {
    event: "sale",
    type: "percentage",
    amountInCents: null,
    amountInPercentage: 10,
    maxDuration: 12,
    description: null,
    spendLimitAmount: null,
    spendLimitInterval: null,
    ...overrides,
  };
}

describe("buildCommissionDescription", () => {
  test("formats a base percentage sale reward", () => {
    expect(
      buildCommissionDescription({
        reward: saleReward(),
      }),
    ).toBe("Earn 10% per sale for 1 year");
  });

  test("formats a base flat lead reward", () => {
    expect(
      buildCommissionDescription({
        reward: saleReward({
          event: "lead",
          type: "flat",
          amountInCents: 2500,
          amountInPercentage: null,
          maxDuration: null,
        }),
      }),
    ).toBe("Earn $25 per lead");
  });

  test("formats a base click reward", () => {
    expect(
      buildCommissionDescription({
        reward: saleReward({
          event: "click",
          type: "flat",
          amountInCents: 50,
          amountInPercentage: null,
          maxDuration: null,
        }),
      }),
    ).toBe("Earn $0.50 per click");
  });

  test("formats a first-sale reward", () => {
    expect(
      buildCommissionDescription({
        reward: saleReward({
          type: "flat",
          amountInCents: 5000,
          amountInPercentage: null,
          maxDuration: 0,
        }),
      }),
    ).toBe("Earn $50 for the first sale");
  });

  test("formats lifetime duration", () => {
    expect(
      buildCommissionDescription({
        reward: saleReward({ maxDuration: null }),
      }),
    ).toBe("Earn 10% per sale for the customer's lifetime");
  });

  test("formats multi-month and multi-year durations", () => {
    expect(
      buildCommissionDescription({
        reward: saleReward({ maxDuration: 6 }),
      }),
    ).toBe("Earn 10% per sale for 6 months");

    expect(
      buildCommissionDescription({
        reward: saleReward({ maxDuration: 24 }),
      }),
    ).toBe("Earn 10% per sale for 2 years");
  });

  test("ignores editable reward.description", () => {
    expect(
      buildCommissionDescription({
        reward: saleReward({
          description: "Custom marketing copy",
        }),
      }),
    ).toBe("Earn 10% per sale for 1 year");
  });

  test("never prints an Up to range even when reward had modifiers", () => {
    const reward = saleReward({
      amountInPercentage: 10,
    });

    expect(
      buildCommissionDescription({
        reward,
      }),
    ).not.toContain("Up to");
  });

  test("appends matched condition clauses to the applied reward rate", () => {
    const matchedCondition: RewardConditions = {
      operator: "AND",
      type: "flat",
      amountInCents: 5000,
      maxDuration: 0,
      conditions: [
        {
          entity: "sale",
          attribute: "productId",
          operator: "equals_to",
          value: "prod_premium",
          label: "Premium Plan",
        },
      ],
    };

    expect(
      buildCommissionDescription({
        // reward already resolved by determinePartnerReward
        reward: saleReward({
          type: "flat",
          amountInCents: 5000,
          amountInPercentage: null,
          maxDuration: 0,
        }),
        matchedCondition,
      }),
    ).toBe("Earn $50 for the first sale if Sale Product ID is Premium Plan");
  });

  test("formats country names", () => {
    const matchedCondition: RewardConditions = {
      operator: "AND",
      type: "percentage",
      amountInPercentage: 20,
      maxDuration: 12,
      conditions: [
        {
          entity: "customer",
          attribute: "country",
          operator: "equals_to",
          value: "US",
        },
      ],
    };

    expect(
      buildCommissionDescription({
        reward: saleReward({ amountInPercentage: 20 }),
        matchedCondition,
      }),
    ).toBe("Earn 20% per sale for 1 year if Customer Country is United States");
  });

  test("formats product label with is operator", () => {
    const matchedCondition: RewardConditions = {
      operator: "AND",
      type: "percentage",
      amountInPercentage: 20,
      maxDuration: 12,
      conditions: [
        {
          entity: "sale",
          attribute: "productId",
          operator: "in",
          value: ["prod_a", "prod_b"],
          label: "Premium Plan",
        },
      ],
    };

    expect(
      buildCommissionDescription({
        reward: saleReward({ amountInPercentage: 20 }),
        matchedCondition,
      }),
    ).toBe("Earn 20% per sale for 1 year if Sale Product ID is Premium Plan");
  });

  test("formats currency attribute values", () => {
    const matchedCondition: RewardConditions = {
      operator: "AND",
      type: "flat",
      amountInCents: 6000,
      maxDuration: 0,
      conditions: [
        {
          entity: "sale",
          attribute: "amount",
          operator: "greater_than_or_equal",
          value: 20000,
        },
      ],
    };

    expect(
      buildCommissionDescription({
        reward: saleReward({
          type: "flat",
          amountInCents: 6000,
          amountInPercentage: null,
          maxDuration: 0,
        }),
        matchedCondition,
      }),
    ).toBe(
      "Earn $60 for the first sale if Sale Amount is greater than or equal to $200.00",
    );
  });

  test("formats metadata attributes", () => {
    const matchedCondition: RewardConditions = {
      operator: "AND",
      type: "percentage",
      amountInPercentage: 15,
      maxDuration: 12,
      conditions: [
        {
          entity: "sale",
          attribute: "metadata",
          operator: "equals_to",
          value: "enterprise",
          metadataField: "plan",
        },
      ],
    };

    expect(
      buildCommissionDescription({
        reward: saleReward({ amountInPercentage: 15 }),
        matchedCondition,
      }),
    ).toBe('Earn 15% per sale for 1 year if Sale "plan" is enterprise');
  });

  test("joins AND conditions", () => {
    const matchedCondition: RewardConditions = {
      operator: "AND",
      type: "flat",
      amountInCents: 5000,
      maxDuration: null,
      conditions: [
        {
          entity: "customer",
          attribute: "country",
          operator: "equals_to",
          value: "US",
        },
        {
          entity: "sale",
          attribute: "productId",
          operator: "equals_to",
          value: "prod_premium",
          label: "Premium Plan",
        },
      ],
    };

    expect(
      buildCommissionDescription({
        reward: saleReward({
          type: "flat",
          amountInCents: 5000,
          amountInPercentage: null,
          maxDuration: null,
        }),
        matchedCondition,
      }),
    ).toBe(
      "Earn $50 per sale for the customer's lifetime if Customer Country is United States and Sale Product ID is Premium Plan",
    );
  });

  test("joins OR conditions", () => {
    const matchedCondition: RewardConditions = {
      operator: "OR",
      type: "percentage",
      amountInPercentage: 25,
      maxDuration: 12,
      conditions: [
        {
          entity: "customer",
          attribute: "country",
          operator: "equals_to",
          value: "US",
        },
        {
          entity: "customer",
          attribute: "country",
          operator: "equals_to",
          value: "CA",
        },
      ],
    };

    expect(
      buildCommissionDescription({
        reward: saleReward({ amountInPercentage: 25 }),
        matchedCondition,
      }),
    ).toBe(
      "Earn 25% per sale for 1 year if Customer Country is United States or Customer Country is Canada",
    );
  });

  test("formats in arrays of country codes", () => {
    const matchedCondition: RewardConditions = {
      operator: "AND",
      type: "percentage",
      amountInPercentage: 20,
      maxDuration: 12,
      conditions: [
        {
          entity: "customer",
          attribute: "country",
          operator: "in",
          value: ["US", "CA", "GB"],
        },
      ],
    };

    expect(
      buildCommissionDescription({
        reward: saleReward({ amountInPercentage: 20 }),
        matchedCondition,
      }),
    ).toBe(
      "Earn 20% per sale for 1 year if Customer Country is one of United States, Canada, United Kingdom",
    );
  });

  test("formats sale type option labels", () => {
    const matchedCondition: RewardConditions = {
      operator: "AND",
      type: "percentage",
      amountInPercentage: 5,
      maxDuration: 12,
      conditions: [
        {
          entity: "sale",
          attribute: "type",
          operator: "equals_to",
          value: "recurring",
        },
      ],
    };

    expect(
      buildCommissionDescription({
        reward: saleReward({ amountInPercentage: 5 }),
        matchedCondition,
      }),
    ).toBe("Earn 5% per sale for 1 year if Sale Type is recurring");
  });

  test("appends capped-from/to suffix when earnings are capped", () => {
    expect(
      buildCommissionDescription({
        reward: saleReward({
          amountInPercentage: 20,
          spendLimitAmount: 10000,
          spendLimitInterval: "month",
        }),
        earnings: 15000,
        cappedEarnings: 10000,
      }),
    ).toBe(
      "Earn 20% per sale for 1 year, capped from $150 to $100 due to $100 per month spend limit",
    );
  });

  test("appends capped-from/to without limit label when spend limit fields missing", () => {
    expect(
      buildCommissionDescription({
        reward: saleReward({ amountInPercentage: 20 }),
        earnings: 5000,
        cappedEarnings: 3000,
      }),
    ).toBe(
      "Earn 20% per sale for 1 year, capped from $50 to $30 due to spend limit",
    );
  });

  test("does not append spend limit suffix when earnings are not capped", () => {
    expect(
      buildCommissionDescription({
        reward: saleReward({
          amountInPercentage: 20,
          spendLimitAmount: 10000,
          spendLimitInterval: "month",
        }),
        earnings: 5000,
        cappedEarnings: 5000,
      }),
    ).toBe("Earn 20% per sale for 1 year");
  });
});
