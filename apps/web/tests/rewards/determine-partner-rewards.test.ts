import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { determinePartnerRewards } from "@/lib/partners/determine-partner-reward";
import { RewardContext } from "@/lib/types";
import { Prisma, Reward } from "@prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    linkReward: {
      findUnique: mocks.findUnique,
    },
  },
}));

const ADDON_PRODUCT_ID = "prod_abc";
const OTHER_PRODUCT_ID = "prod_other";
const LINK_ID = "link_test";

function saleReward(overrides: Partial<Reward> = {}): Reward {
  return {
    id: "rw_test",
    programId: "prog_test",
    groupId: "grp_test",
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

function enrollment(
  saleRewardValue: Reward | null,
  { linkId }: { linkId?: string | null } = {},
) {
  return {
    partner: { country: null },
    links: linkId ? [{ id: linkId } as any] : null,
    totalCommissions: 0,
    saleReward: saleRewardValue,
  };
}

function mockLinkSaleReward(saleRewardValue: Reward | null) {
  mocks.findUnique.mockResolvedValue({
    clickReward: null,
    leadReward: null,
    saleReward: saleRewardValue,
  });
}

function productIdModifier({
  id,
  productId,
  amountInPercentage,
}: {
  id: string;
  productId: string;
  amountInPercentage: number;
}) {
  return {
    id,
    type: "percentage" as const,
    operator: "AND" as const,
    conditions: [
      {
        value: productId,
        entity: "sale" as const,
        operator: "equals_to" as const,
        attribute: "productId" as const,
      },
    ],
    amountInPercentage,
  };
}

function determineRewards({
  saleReward: saleRewardValue,
  context,
  amount = 20000,
  quantity = 1,
  linkId = null,
}: {
  saleReward: Reward | null;
  context?: RewardContext;
  amount?: number;
  quantity?: number;
  linkId?: string | null;
}) {
  return determinePartnerRewards({
    event: "sale",
    programEnrollment: enrollment(saleRewardValue, { linkId }),
    ...(context ? { context } : {}),
    amount,
    quantity,
    linkId,
  });
}

describe("determinePartnerRewards", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.findUnique.mockResolvedValue(null);
  });

  test("does not multiply a flat reward by Stripe line quantity", async () => {
    const rewards = await determineRewards({
      saleReward: saleReward({
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
    });

    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(rewards).toHaveLength(1);
    expect(rewards[0].sale).toEqual({ amount: 20000, quantity: 1 });
    expect(rewards[0].reward.type).toBe("flat");
    expect(rewards[0].reward.amountInCents).toBe(6000);
    expect(rewards[0].matchedCondition).toMatchObject({
      type: "flat",
      amountInCents: 6000,
      maxDuration: 0,
    });
    expect(
      calculateSaleEarnings({
        reward: rewards[0].reward,
        sale: rewards[0].sale,
      }),
    ).toBe(6000);
  });

  test("applies percentage rewards to the line total, ignoring line quantity", async () => {
    const rewards = await determineRewards({
      saleReward: saleReward({
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

  test("uses the sale quantity when there is no productId modifier", async () => {
    const rewards = await determineRewards({
      saleReward: saleReward({
        type: "flat",
        amountInCents: 500,
        amountInPercentage: null,
      }),
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
    });

    expect(rewards).toHaveLength(1);
    expect(rewards[0].sale).toEqual({ amount: 20000, quantity: 1 });
    expect(rewards[0].matchedCondition).toBeNull();
  });

  test("uses LinkReward.saleReward when it differs from the enrollment reward", async () => {
    const enrollmentReward = saleReward({
      id: "rw_enrollment",
      amountInPercentage: new Prisma.Decimal(30),
    });
    const linkOverride = saleReward({
      id: "rw_link",
      amountInPercentage: new Prisma.Decimal(50),
    });
    mockLinkSaleReward(linkOverride);

    const rewards = await determineRewards({
      saleReward: enrollmentReward,
      linkId: LINK_ID,
      amount: 20000,
      quantity: 1,
    });

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: {
        linkId: LINK_ID,
      },
      select: {
        saleReward: true,
      },
    });
    expect(rewards).toHaveLength(1);
    expect(rewards[0].reward.id).toBe("rw_link");
    expect(rewards[0].reward.amountInPercentage).toBe(50);
    expect(
      calculateSaleEarnings({
        reward: rewards[0].reward,
        sale: rewards[0].sale,
      }),
    ).toBe(10000);
  });

  test("falls back to the enrollment reward when the link has no sale override", async () => {
    mockLinkSaleReward(null);

    const rewards = await determineRewards({
      saleReward: saleReward({
        id: "rw_enrollment",
        amountInPercentage: new Prisma.Decimal(30),
      }),
      linkId: LINK_ID,
      amount: 20000,
      quantity: 1,
    });

    expect(mocks.findUnique).toHaveBeenCalledOnce();
    expect(rewards).toHaveLength(1);
    expect(rewards[0].reward.id).toBe("rw_enrollment");
    expect(rewards[0].reward.amountInPercentage).toBe(30);
    expect(
      calculateSaleEarnings({
        reward: rewards[0].reward,
        sale: rewards[0].sale,
      }),
    ).toBe(6000);
  });

  test("applies the link sale reward's product rates when splitting Stripe line items", async () => {
    const enrollmentReward = saleReward({
      id: "rw_enrollment",
      amountInPercentage: new Prisma.Decimal(30),
      modifiers: [
        productIdModifier({
          id: "enrollment-addon-zero",
          productId: ADDON_PRODUCT_ID,
          amountInPercentage: 0,
        }),
      ],
    });
    const linkOverride = saleReward({
      id: "rw_link",
      amountInPercentage: new Prisma.Decimal(20),
      modifiers: [
        productIdModifier({
          id: "link-addon-fifty",
          productId: ADDON_PRODUCT_ID,
          amountInPercentage: 50,
        }),
      ],
    });
    mockLinkSaleReward(linkOverride);

    const rewards = await determineRewards({
      saleReward: enrollmentReward,
      linkId: LINK_ID,
      context: {
        sale: {
          products: [
            {
              id: ADDON_PRODUCT_ID,
              amount: 20000,
              quantity: 1,
            },
            {
              id: OTHER_PRODUCT_ID,
              amount: 10000,
              quantity: 1,
            },
          ],
        },
      },
      amount: 30000,
      quantity: 1,
    });

    expect(rewards).toHaveLength(2);
    expect(rewards.map((item) => item.reward.id)).toEqual([
      "rw_link",
      "rw_link",
    ]);
    expect(rewards[0].sale).toEqual({ amount: 20000, quantity: 1 });
    expect(rewards[0].reward.amountInPercentage).toBe(50);
    expect(rewards[1].sale).toEqual({ amount: 10000, quantity: 1 });
    expect(rewards[1].reward.amountInPercentage).toBe(20);
    expect(
      calculateSaleEarnings({
        reward: rewards[0].reward,
        sale: rewards[0].sale,
      }),
    ).toBe(10000);
    expect(
      calculateSaleEarnings({
        reward: rewards[1].reward,
        sale: rewards[1].sale,
      }),
    ).toBe(2000);
  });
});
