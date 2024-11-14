import { TrackSaleResponse } from "@/lib/types";
import { randomId } from "tests/utils/helpers";
import {
  E2E_CUSTOMER_EXTERNAL_ID,
  E2E_CUSTOMER_ID,
} from "tests/utils/resource";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

test("POST /track/sale", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  const sale = {
    eventName: "Subscription",
    amount: 100,
    currency: "usd",
    invoiceId: `INV_${randomId()}`,
    paymentProcessor: "stripe",
  };

  const response = await http.post<TrackSaleResponse>({
    path: "/track/sale",
    body: {
      ...sale,
      externalId: E2E_CUSTOMER_EXTERNAL_ID,
    },
  });

  expect(response.status).toEqual(200);
  expect(response.data).toStrictEqual({
    eventName: "Subscription",
    customer: {
      id: E2E_CUSTOMER_ID,
      name: expect.any(String),
      email: expect.any(String),
      avatar: expect.any(String),
      externalId: E2E_CUSTOMER_EXTERNAL_ID,
    },
    sale: {
      amount: 100,
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
