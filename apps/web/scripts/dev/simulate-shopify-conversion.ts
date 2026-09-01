import "dotenv-flow/config";

import { nanoid } from "@dub/utils";
import { createHmac } from "crypto";

async function main() {
  const clickId = "";
  const checkoutToken = nanoid(10);
  const storeId = "store.dub.co";

  await trackPixel({
    clickId,
    checkoutToken,
  });

  await trackOrderPaid({
    checkoutToken,
    storeId,
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

  return response.json();
}

async function trackOrderPaid({
  checkoutToken,
  storeId,
}: {
  checkoutToken: string;
  storeId: string;
}) {
  const payload = shopifyOrderPayload({ checkoutToken });
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

  return response.json();
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
        amount: 50,
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
