import { createId } from "@/lib/api/create-id";
import { shopifyCheckoutCache } from "@/lib/integrations/shopify/checkout-cache";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { DiscountProvider, EventType, RewardStructure } from "@prisma/client";
import { createHmac } from "crypto";
import { randomName, randomPartnerEmail } from "../../utils";
import { PLAYWRIGHT_API_BASE } from "../constants";
import type { ApiClient } from "../fixtures";
import { deletePartner } from "../partners/helpers";
import { TEST_WORKSPACE } from "../setup-test-workspace";

export const SHOPIFY_ORDER_AMOUNT_CENTS = 2250; // $22.50
export const SHOPIFY_SALE_REWARD_PERCENT = 10;

export function shopifyOrderPayload({
  checkoutToken,
  ...overrides
}: {
  checkoutToken: string;
} & Record<string, unknown>) {
  return {
    confirmation_number: nanoid(10).toUpperCase(),
    checkout_token: checkoutToken,
    customer: {
      id: randomName("pw_cus", 16),
      first_name: "Playwright",
      last_name: "Shopify",
      email: `pw.shopify.${nanoid(8)}@dub-internal-test.com`,
    },
    current_subtotal_price_set: {
      shop_money: {
        amount: (SHOPIFY_ORDER_AMOUNT_CENTS / 100).toFixed(2),
        currency_code: "USD",
      },
    },
    discount_codes: [],
    billing_address: {
      province: "California",
      country_code: "US",
    },
    ...overrides,
  };
}

function shopifyWebhookSignature(body: string) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    return undefined;
  }

  return createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

export async function postShopifyPixel({
  clickId,
  checkoutToken,
}: {
  clickId: string | null;
  checkoutToken: string;
}) {
  const response = await fetch(`${PLAYWRIGHT_API_BASE}/api/shopify/pixel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clickId,
      checkoutToken,
    }),
  });

  return {
    status: response.status,
    data: await response.json(),
  };
}

export async function postShopifyOrdersPaidWebhook({
  checkoutToken,
  ...orderOverrides
}: {
  checkoutToken: string;
} & Record<string, unknown>) {
  const payload = shopifyOrderPayload({ checkoutToken, ...orderOverrides });
  const body = JSON.stringify(payload);
  const signature = shopifyWebhookSignature(body);

  const response = await fetch(
    `${PLAYWRIGHT_API_BASE}/api/shopify/integration/webhook`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shopify-topic": "orders/paid",
        "x-shopify-shop-domain": TEST_WORKSPACE.shopify.storeId,
        ...(signature && { "x-shopify-hmac-sha256": signature }),
      },
      body,
    },
  );

  return {
    status: response.status,
    data: await response.text(),
    payload,
  };
}

/** Pixel writes clickId via waitUntil — wait until Redis has it before the webhook. */
export async function waitForShopifyCheckoutClickId({
  checkoutToken,
  clickId,
}: {
  checkoutToken: string;
  clickId: string;
}) {
  await expect
    .poll(
      async () => {
        const { clickId } = await shopifyCheckoutCache.get(checkoutToken);
        return clickId;
      },
      { timeout: 5_000 },
    )
    .toEqual(clickId);
}

export async function seedShopifyPartner({
  workspaceId,
  programId,
  groupId,
  withDiscountCode = false,
}: {
  workspaceId: string;
  programId: string;
  groupId: string;
  withDiscountCode?: boolean;
}) {
  const partnerId = createId({ prefix: "pn_" });
  const linkId = createId({ prefix: "link_" });
  const saleRewardId = createId({ prefix: "rw_" });
  const discountId = withDiscountCode
    ? createId({ prefix: "disc_" })
    : undefined;
  const code = withDiscountCode ? `PW${nanoid(8).toUpperCase()}` : undefined;
  const key = randomName("pw", 8);

  await prisma.partner.create({
    data: {
      id: partnerId,
      name: randomName("pw-shopify"),
      email: randomPartnerEmail(),
      username: randomName("pw", 12),
    },
  });

  await prisma.reward.create({
    data: {
      id: saleRewardId,
      programId,
      event: EventType.sale,
      type: RewardStructure.percentage,
      amountInPercentage: SHOPIFY_SALE_REWARD_PERCENT,
      maxDuration: 0,
    },
  });

  if (discountId) {
    await prisma.discount.create({
      data: {
        id: discountId,
        programId,
        amount: 10,
        type: RewardStructure.percentage,
        maxDuration: null,
        provider: DiscountProvider.custom,
      },
    });
  }

  await prisma.programEnrollment.create({
    data: {
      id: createId({ prefix: "pge_" }),
      partnerId,
      programId,
      groupId,
      status: "approved",
      saleRewardId,
      discountId,
    },
  });

  await prisma.link.create({
    data: {
      id: linkId,
      domain: TEST_WORKSPACE.program.domain,
      key,
      url: TEST_WORKSPACE.program.url,
      shortLink: `https://${TEST_WORKSPACE.program.domain}/${key}`,
      projectId: workspaceId,
      programId,
      partnerId,
      trackConversion: true,
    },
  });

  if (discountId && code) {
    await prisma.discountCode.create({
      data: {
        id: createId({ prefix: "dcode_" }),
        code,
        programId,
        partnerId,
        linkId,
        discountId,
      },
    });
  }

  return {
    partnerId,
    linkId,
    saleRewardId,
    discountId,
    code,
    domain: TEST_WORKSPACE.program.domain,
    key,
  };
}

export type SeededShopifyPartner = Awaited<
  ReturnType<typeof seedShopifyPartner>
>;

export async function cleanupShopifyPartner({
  partnerId,
  saleRewardId,
  discountId,
}: {
  partnerId: string | undefined;
  saleRewardId: string | undefined;
  discountId?: string | undefined;
}) {
  if (partnerId) {
    await prisma.customer.deleteMany({ where: { partnerId } });
  }

  await deletePartner(partnerId);

  if (discountId) {
    await prisma.discount.delete({ where: { id: discountId } }).catch(() => {});
  }

  if (saleRewardId) {
    await prisma.reward.delete({ where: { id: saleRewardId } }).catch(() => {});
  }
}

/** Seeds a Shopify partner and always cleans up, even when the test body throws. */
export async function withShopifyPartner<T>(
  {
    workspaceId,
    programId,
    groupId,
    withDiscountCode = false,
  }: {
    workspaceId: string;
    programId: string;
    groupId: string;
    withDiscountCode?: boolean;
  },
  run: (seeded: SeededShopifyPartner) => Promise<T>,
): Promise<T> {
  const seeded = await seedShopifyPartner({
    workspaceId,
    programId,
    groupId,
    withDiscountCode,
  });

  try {
    return await run(seeded);
  } finally {
    await cleanupShopifyPartner(seeded);
  }
}

export async function waitForShopifyCustomerSale({
  workspaceId,
  externalId,
  amount = SHOPIFY_ORDER_AMOUNT_CENTS,
}: {
  workspaceId: string;
  externalId: string;
  amount?: number;
}) {
  await expect
    .poll(
      async () => {
        const customer = await prisma.customer.findUnique({
          where: {
            projectId_externalId: {
              projectId: workspaceId,
              externalId,
            },
          },
        });

        if (!customer) {
          return null;
        }

        return {
          id: customer.id,
          sales: customer.sales,
          saleAmount: Number(customer.saleAmount),
        };
      },
      { timeout: 30_000 },
    )
    .toEqual({
      id: expect.any(String),
      sales: 1,
      saleAmount: amount,
    });

  return prisma.customer.findUniqueOrThrow({
    where: {
      projectId_externalId: {
        projectId: workspaceId,
        externalId,
      },
    },
  });
}

export async function waitForShopifySaleCommission({
  partnerId,
  customerId,
  amount = SHOPIFY_ORDER_AMOUNT_CENTS,
  earnings = Math.round(
    (SHOPIFY_ORDER_AMOUNT_CENTS * SHOPIFY_SALE_REWARD_PERCENT) / 100,
  ),
}: {
  partnerId: string;
  customerId: string;
  amount?: number;
  earnings?: number;
}) {
  await expect
    .poll(
      async () => {
        const commission = await prisma.commission.findFirst({
          where: {
            partnerId,
            customerId,
            type: "sale",
          },
        });

        if (!commission) {
          return null;
        }

        return {
          amount: commission.amount,
          earnings: commission.earnings,
          type: commission.type,
          invoiceId: commission.invoiceId,
        };
      },
      { timeout: 30_000 },
    )
    .toEqual({
      amount,
      earnings,
      type: "sale",
      invoiceId: expect.any(String),
    });
}

export async function waitForShopifySaleEvent({
  api,
  customerId,
  amount = SHOPIFY_ORDER_AMOUNT_CENTS,
}: {
  api: ApiClient;
  customerId: string;
  amount?: number;
}) {
  await expect
    .poll(
      async () => {
        const { status, data } = await api.get<
          {
            event: string;
            eventName: string;
            sale: { amount: number; paymentProcessor: string };
            customer: { id: string };
          }[]
        >(
          `/api/events?${new URLSearchParams({
            event: "sales",
            interval: "24h",
            customerId,
          })}`,
        );

        if (status !== 200 || !Array.isArray(data) || data.length === 0) {
          return null;
        }

        const sale = data.find((event) => event.customer?.id === customerId);
        if (!sale) {
          return null;
        }

        return {
          event: sale.event,
          eventName: sale.eventName,
          amount: sale.sale.amount,
          paymentProcessor: sale.sale.paymentProcessor,
        };
      },
      { timeout: 30_000 },
    )
    .toEqual({
      event: "sale",
      eventName: "Purchase",
      amount,
      paymentProcessor: "shopify",
    });
}
