import { CommissionResponse, TrackSaleResponse } from "@/lib/types";
import { randomValue } from "@dub/utils";
import { randomId } from "tests/utils/helpers";
import {
  E2E_CUSTOMER_EXTERNAL_ID,
  E2E_CUSTOMER_EXTERNAL_ID_2,
  E2E_CUSTOMER_ID,
  E2E_REWARD,
} from "tests/utils/resource";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const expectValidSaleResponse = (
  response: { status: number; data: TrackSaleResponse },
  sale: any,
) => {
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
};

const randomSaleAmount = () => {
  return randomValue([400, 900, 1900]);
};

describe("POST /track/sale", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  const sale = {
    eventName: "Subscription",
    amount: randomSaleAmount(),
    currency: "usd",
    invoiceId: `INV_${randomId()}`,
    paymentProcessor: "stripe",
  };

  test("track a sale", async () => {
    const response = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        customerExternalId: E2E_CUSTOMER_EXTERNAL_ID,
      },
    });

    expectValidSaleResponse(response, sale);
  });

  test("track a sale with an invoiceId that is already processed (should return null customer and sale) ", async () => {
    const response = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        customerExternalId: E2E_CUSTOMER_EXTERNAL_ID,
        invoiceId: sale.invoiceId,
      },
    });

    expect(response.status).toEqual(200);
    expect(response.data).toStrictEqual({
      eventName: "Subscription",
      customer: null,
      sale: null,
    });
  });

  test("track a sale with premium product ID (should create commission)", async () => {
    const newInvoiceId = `INV_${randomId()}`;
    const response = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        amount: randomValue([2000, 3000, 5000]),
        customerExternalId: E2E_CUSTOMER_EXTERNAL_ID_2,
        invoiceId: newInvoiceId,
        metadata: {
          productId: "premiumProductId",
        },
      },
    });

    expect(response.status).toEqual(200);

    // pause for 3 seconds for data to be fully processed
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const { status, data: commissions } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: {
        invoiceId: newInvoiceId,
      },
    });

    expect(status).toEqual(200);
    expect(commissions).toHaveLength(1);
    expect(commissions[0].invoiceId).toEqual(newInvoiceId);
    expect(commissions[0].amount).toEqual(sale.amount);
    expect(commissions[0].earnings).toEqual(E2E_REWARD.modifiers[0].amount);
  });

  test("track a sale with an externalId that does not exist (should return null customer and sale)", async () => {
    const response = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        invoiceId: `INV_${randomId()}`,
        customerExternalId: "external-id-that-does-not-exist",
      },
    });

    expect(response.status).toEqual(200);
    expect(response.data).toStrictEqual({
      eventName: "Subscription",
      customer: null,
      sale: null,
    });
  });

  test("track a sale with `externalId` (backward compatibility)", async () => {
    const newSale = {
      ...sale,
      invoiceId: `INV_${randomId()}`,
      amount: randomSaleAmount(),
    };

    const response = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...newSale,
        externalId: E2E_CUSTOMER_EXTERNAL_ID,
      },
    });

    expectValidSaleResponse(response, newSale);
  });

  test("track a sale with `customerId` (backward compatibility)", async () => {
    const newSale = {
      ...sale,
      invoiceId: `INV_${randomId()}`,
      amount: randomSaleAmount(),
    };

    const response5 = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...newSale,
        customerId: E2E_CUSTOMER_EXTERNAL_ID,
      },
    });

    expectValidSaleResponse(response5, newSale);
  });

  test("track a sale with JPY currency (zero decimal currency)", async () => {
    const jpySale = {
      ...sale,
      eventName: "Payment in JPY",
      invoiceId: `INV_${randomId()}`,
      amount: 1437, // approximately 1000 USD cents
      currency: "jpy",
    };

    const response = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...jpySale,
        customerExternalId: E2E_CUSTOMER_EXTERNAL_ID,
      },
    });

    // Check if the converted amount is within an acceptable range
    // 1437 JPY should be around 1000 USD cents (±100)
    expect(response.status).toEqual(200);
    expect(response.data.sale?.currency).toEqual("usd");
    expect(response.data.sale?.amount).toBeGreaterThanOrEqual(900); // 900 cents
    expect(response.data.sale?.amount).toBeLessThanOrEqual(1100); // 1100 cents
  });
});
