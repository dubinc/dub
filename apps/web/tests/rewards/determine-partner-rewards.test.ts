import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { determinePartnerRewards } from "@/lib/partners/determine-partner-reward";
import { Prisma, Reward } from "@prisma/client";
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const ADDON_PRODUCT_ID = "prod_abc";

function saleReward(overrides: Partial<Reward> = {}): Reward {
  return {
    id: "rw_test",
    programId: "prog_test",
    description: null,
    tooltipDescription: null,
    event: "sale",
    type: "percentage",
    amountInCents: null,
    amountInPercentage: new Prisma.Decimal(30),
    maxDuration: 12,
    modifiers: null,
    config: null,
    spendLimitAmount: null,
    spendLimitInterval: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function enrollment(saleRewardValue: Reward) {
  return {
    partner: { country: null },
    links: null,
    totalCommissions: 0,
    saleReward: saleRewardValue,
  };
}

describe("determinePartnerRewards", () => {
  test("does not multiply a flat reward by Stripe line quantity", () => {
    const rewards = determinePartnerRewards({
      event: "sale",
      programEnrollment: enrollment(
        saleReward({
          modifiers: [
            {
              id: "product-zero-percent",
              type: "percentage",
              operator: "AND",
              conditions: [
                {
                  value: [ADDON_PRODUCT_ID, "prod_xyz"],
                  entity: "sale",
                  operator: "in",
                  attribute: "productId",
                },
              ],
              maxDuration: 12,
              amountInPercentage: 0,
            },
            {
              id: "amount-gte-200",
              type: "flat",
              operator: "AND",
              conditions: [
                {
                  value: 20000,
                  entity: "sale",
                  operator: "greater_than_or_equal",
                  attribute: "amount",
                },
              ],
              maxDuration: 0,
              amountInCents: 6000,
            },
          ],
        }),
      ),
      context: {
        sale: {
          amount: 20000,
          products: [
            {
              id: ADDON_PRODUCT_ID,
              amount: 20000,
              quantity: 200,
            },
          ],
        },
      },
      amount: 20000,
      quantity: 1,
    });

    expect(rewards).toHaveLength(1);
    expect(rewards[0].sale).toEqual({ amount: 20000, quantity: 1 });
    expect(rewards[0].reward.type).toBe("flat");
    expect(rewards[0].reward.amountInCents).toBe(6000);
    expect(
      calculateSaleEarnings({
        reward: rewards[0].reward,
        sale: rewards[0].sale,
      }),
    ).toBe(6000);
  });

  test("applies percentage rewards to the line total, ignoring line quantity", () => {
    const rewards = determinePartnerRewards({
      event: "sale",
      programEnrollment: enrollment(
        saleReward({
          modifiers: [
            {
              type: "percentage",
              operator: "AND",
              amountInPercentage: 10,
              conditions: [
                {
                  entity: "sale",
                  attribute: "productId",
                  operator: "equals_to",
                  value: ADDON_PRODUCT_ID,
                },
              ],
            },
          ],
        }),
      ),
      context: {
        sale: {
          products: [
            {
              id: ADDON_PRODUCT_ID,
              amount: 20000,
              quantity: 200,
            },
          ],
        },
      },
      amount: 20000,
      quantity: 1,
    });

    expect(rewards).toHaveLength(1);
    expect(rewards[0].sale.quantity).toBe(1);
    expect(
      calculateSaleEarnings({
        reward: rewards[0].reward,
        sale: rewards[0].sale,
      }),
    ).toBe(2000);
  });

  test("uses the sale quantity when there is no productId modifier", () => {
    const rewards = determinePartnerRewards({
      event: "sale",
      programEnrollment: enrollment(
        saleReward({
          type: "flat",
          amountInCents: 500,
          amountInPercentage: null,
        }),
      ),
      context: {
        sale: {
          products: [
            {
              id: ADDON_PRODUCT_ID,
              amount: 20000,
              quantity: 200,
            },
          ],
        },
      },
      amount: 20000,
      quantity: 1,
    });

    expect(rewards).toHaveLength(1);
    expect(rewards[0].sale).toEqual({ amount: 20000, quantity: 1 });
  });
});
