import { TrackSaleResponse } from "@/lib/types";
import { randomValue } from "@dub/utils";
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
    amount: randomValue([400, 900, 1900]),
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

  // An invoiceId that is already processed should return null customer and sale
  const response2 = await http.post<TrackSaleResponse>({
    path: "/track/sale",
    body: {
      ...sale,
      externalId: E2E_CUSTOMER_EXTERNAL_ID,
      invoiceId: sale.invoiceId,
    },
  });

  expect(response2.status).toEqual(200);
  expect(response2.data).toStrictEqual({
    eventName: "Subscription",
    customer: null,
    sale: null,
  });

  // An externalId that does not exist should return null customer and sale
  const response3 = await http.post<TrackSaleResponse>({
    path: "/track/sale",
    body: {
      ...sale,
      invoiceId: `INV_${randomId()}`,
      externalId: "external-id-that-does-not-exist",
    },
  });

  expect(response3.status).toEqual(200);
  expect(response3.data).toStrictEqual({
    eventName: "Subscription",
    customer: null,
    sale: null,
  });
});
