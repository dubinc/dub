import "dotenv-flow/config";

import { nanoid } from "@dub/utils";
import { createHmac } from "crypto";

async function main() {
  const clickId = "RZjkGhi04FGxWjcK";
  const checkoutToken = nanoid(10);
  const storeId = "store.dub.co";
  const existingCustomerId = null;
  const discountCode = null;

  await trackPixel({
    clickId,
    checkoutToken,
  });

  await new Promise((resolve) => setTimeout(resolve, 4000));

  await trackOrderPaid({
    checkoutToken,
    storeId,
    existingCustomerId,
    discountCode,
  });
}

async function trackPixel({
  clickId,
  checkoutToken,
}: {
  clickId: string;
  checkoutToken: string;
}) {
  const response = await fetch("http://localhost:8888/api/shopify/pixel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clickId,
      checkoutToken,
    }),
  });

  const data = await response.json();

  console.log("trackPixel", data);
}

async function trackOrderPaid({
  checkoutToken,
  storeId,
  existingCustomerId,
  discountCode,
}: {
  checkoutToken: string;
  storeId: string;
  existingCustomerId?: string | null;
  discountCode?: string | null;
}) {
  const payload = shopifyOrderPayload({
    checkoutToken,
    ...(existingCustomerId && {
      customer: { id: existingCustomerId },
    }),
    ...(discountCode && {
      discount_codes: [{ code: discountCode }],
    }),
  });

  const body = JSON.stringify(payload);
  const signature = shopifyWebhookSignature(body);

  const response = await fetch(
    "http://localhost:8888/api/shopify/integration/webhook",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shopify-topic": "orders/paid",
        "x-shopify-shop-domain": storeId,
        ...(signature && { "x-shopify-hmac-sha256": signature }),
      },
      body,
    },
  );

  const data = await response.text();

  console.log("trackOrderPaid", data);
}

function shopifyWebhookSignature(body: string) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret) {
    return undefined;
  }

  return createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

function shopifyOrderPayload({
  checkoutToken,
  ...overrides
}: {
  checkoutToken: string;
} & Record<string, unknown>) {
  return {
    confirmation_number: nanoid(10),
    checkout_token: checkoutToken,
    customer: {
      id: nanoid(10),
      first_name: "John",
      last_name: "Doe",
      email: `john.doe.${nanoid(5)}@example.com`,
    },
    current_subtotal_price_set: {
      shop_money: {
        amount: "72",
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

main();
