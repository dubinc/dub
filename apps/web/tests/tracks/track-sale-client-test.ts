import { randomId, randomSaleAmount } from "tests/utils/helpers";
import {
  E2E_CUSTOMER_EXTERNAL_ID,
  E2E_CUSTOMER_ID,
} from "tests/utils/resource";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe("POST /track/sale/client", async () => {
  const h = new IntegrationHarness();
  const { env } = await h.init();

  const sale = {
    eventName: "Subscription",
    amount: randomSaleAmount(),
    currency: "usd",
    invoiceId: `INV_${randomId()}`,
    paymentProcessor: "stripe",
  };

  test("track a sale", async () => {
    const response = await fetch(`${env.E2E_BASE_URL}/api/track/sale/client`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.E2E_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({}),
    });

    const leadResponse = await response.json();

    expect(response.status).toEqual(200);
    expect(leadResponse).toStrictEqual({
      eventName: "Subscription",
      customer: {
        id: E2E_CUSTOMER_ID,
        name: expect.any(String),
        email: expect.any(String),
        avatar: expect.any(String),
        externalId: E2E_CUSTOMER_EXTERNAL_ID,
      },
      sale: {
        amount: sale.amount,
        currency: sale.currency,
        paymentProcessor: sale.paymentProcessor,
        invoiceId: sale.invoiceId,
        metadata: null,
      },
      amount: sale.amount,
      currency: sale.currency,
      paymentProcessor: sale.paymentProcessor,
      metadata: null,
      invoiceId: sale.invoiceId,
    });
  });
});
