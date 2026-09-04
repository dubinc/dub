import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { readFileSync } from "fs";
import path from "path";
import { randomCustomer } from "../../utils";
import { PLAYWRIGHT_API_BASE } from "../constants";

const TRACK_CLICK_HEADERS = {
  referer: "https://dub.co",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

function playwrightApiToken() {
  return JSON.parse(
    readFileSync(path.join(__dirname, "../../.auth/api.json"), "utf-8"),
  ).token as string;
}

async function postAuthenticatedJson(
  url: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
) {
  const response = await fetch(`${PLAYWRIGHT_API_BASE}${url}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${playwrightApiToken()}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    data: (await response.json()) as Record<string, any>,
  };
}

export async function trackClick({
  domain,
  key,
}: {
  domain: string;
  key: string;
}) {
  const { status, data } = await postAuthenticatedJson(
    "/api/track/click",
    { domain, key },
    TRACK_CLICK_HEADERS,
  );

  expect(status).toEqual(200);
  expect(data.clickId).toEqual(expect.any(String));

  return data as { clickId: string };
}

export async function trackLead({
  clickId,
  ...overrides
}: {
  clickId: string;
} & Record<string, unknown>) {
  const customer = randomCustomer();

  const { status, data } = await postAuthenticatedJson("/api/track/lead", {
    clickId,
    eventName: `Signup-${nanoid()}`,
    customerExternalId: customer.externalId,
    customerEmail: customer.email,
    customerName: customer.name,
    ...overrides,
  });

  expect(status).toEqual(200);

  return {
    customer,
    data,
  };
}

export async function trackSale({
  customerExternalId,
  ...overrides
}: {
  customerExternalId: string;
} & Record<string, unknown>) {
  const invoiceId =
    (overrides.invoiceId as string | undefined) ?? `INV_${nanoid()}`;
  const amount = (overrides.amount as number | undefined) ?? 1000;

  const { status, data } = await postAuthenticatedJson("/api/track/sale", {
    customerExternalId,
    amount,
    currency: "usd",
    paymentProcessor: "stripe",
    eventName: "Purchase",
    invoiceId,
    ...overrides,
  });

  expect(status).toEqual(200);

  return {
    invoiceId,
    amount,
    data,
  };
}
