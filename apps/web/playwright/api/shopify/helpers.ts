import { nanoid } from "@dub/utils";
import { createHmac } from "crypto";
import { PLAYWRIGHT_API_BASE } from "../constants";
import { TEST_WORKSPACE } from "../setup-test-workspace";

export function shopifyCheckoutToken() {
  return `pw_checkout_${nanoid(24)}`;
}

export function shopifyClickId() {
  return `pw_click_${nanoid(16)}`;
}

export function shopifyOrderPayload({
  checkoutToken,
}: {
  checkoutToken: string;
}) {
  return {
    confirmation_number: nanoid(10).toUpperCase(),
    checkout_token: checkoutToken,
    customer: {
      id: Math.floor(Math.random() * 1_000_000_000),
      first_name: "Playwright",
      last_name: "Shopify",
      email: `pw.shopify.${nanoid(8)}@dub-internal-test.com`,
    },
    current_subtotal_price_set: {
      shop_money: {
        amount: "22.50",
        currency_code: "USD",
      },
    },
    discount_codes: [],
    billing_address: {
      province: "California",
      country_code: "US",
    },
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
}: {
  checkoutToken: string;
}) {
  const payload = shopifyOrderPayload({ checkoutToken });
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
  };
}
