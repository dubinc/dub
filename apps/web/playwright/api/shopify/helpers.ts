import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type { Customer, EnrolledPartnerProps } from "@/lib/types";
import { nanoid } from "@dub/utils";
import { createHmac } from "crypto";
import { PLAYWRIGHT_API_BASE } from "../constants";
import type { ApiClient } from "../fixtures";
import { TEST_WORKSPACE } from "../setup-test-workspace";

export function shopifyOrderPayload({
  checkoutToken,
  amount = (Math.random() * 100).toFixed(2),
  ...overrides
}: {
  checkoutToken: string;
  amount?: string | number;
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
        amount: String(amount),
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
  return createHmac("sha256", `${process.env.SHOPIFY_WEBHOOK_SECRET}`)
    .update(body, "utf8")
    .digest("base64");
}

export async function postShopifyPixel({
  clickId,
  checkoutToken,
}: {
  clickId?: string | null;
  checkoutToken?: string;
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
  storeId = TEST_WORKSPACE.shopify.storeId,
  existingCustomerId,
  discountCode,
  amount,
  ...orderOverrides
}: {
  checkoutToken: string;
  storeId?: string;
  existingCustomerId?: string | null;
  discountCode?: string | null;
  amount?: string | number;
} & Record<string, unknown>) {
  const payload = shopifyOrderPayload({
    checkoutToken,
    amount,
    ...(existingCustomerId && {
      customer: { id: existingCustomerId },
    }),
    ...(discountCode && {
      discount_codes: [{ code: discountCode }],
    }),
    ...orderOverrides,
  });
  const body = JSON.stringify(payload);
  const signature = shopifyWebhookSignature(body);

  const response = await fetch(
    `${PLAYWRIGHT_API_BASE}/api/shopify/integration/webhook`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shopify-topic": "orders/paid",
        "x-shopify-shop-domain": storeId,
        "x-shopify-hmac-sha256": signature,
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

export function partnerDefaultLink(partner: EnrolledPartnerProps) {
  const link = partner.links?.[0];

  if (!link?.id || !link.domain || !link.key) {
    throw new Error("Partner was created without a default link.");
  }

  return link;
}

export async function createPartnerDiscountCode({
  programId,
  partnerId,
  linkId,
}: {
  programId: string;
  partnerId: string;
  linkId: string;
}) {
  const code = `PW${nanoid(8).toUpperCase()}`;

  await prisma.discountCode.create({
    data: {
      id: createId({ prefix: "dcode_" }),
      code,
      programId,
      partnerId,
      linkId,
    },
  });

  return code;
}

export async function getCustomerByExternalId(
  api: ApiClient,
  externalId: string,
) {
  const { status, data } = await api.get<Customer[]>(
    `/api/customers?externalId=${encodeURIComponent(externalId)}`,
  );

  if (status !== 200 || !Array.isArray(data) || data.length === 0) {
    return undefined;
  }

  return data[0];
}
