import { TrackSaleResponse } from "@/lib/types";
import {
  randomCustomer,
  randomId,
  randomSaleAmount,
} from "tests/utils/helpers";
import {
  E2E_CUSTOMER_EXTERNAL_ID,
  E2E_CUSTOMER_EXTERNAL_ID_2,
  E2E_CUSTOMER_ID,
  E2E_SALE_REWARD,
  E2E_TRACK_CLICK_HEADERS,
} from "tests/utils/resource";
import { verifyCommission } from "tests/utils/verify-commission";
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
  });
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

  test("track a sale with an invoiceId that is already processed (should return the same response as before) ", async () => {
    const response = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        customerExternalId: E2E_CUSTOMER_EXTERNAL_ID,
        invoiceId: sale.invoiceId,
      },
    });

    // should return the same response since it's idempotent
    expectValidSaleResponse(response, sale);
  });

  test("track a sale with regular vs premium product ID (should create the right commission)", async () => {
    const regularInvoiceId = `INV_${randomId()}`;
    const response1 = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        amount: 2000,
        customerExternalId: E2E_CUSTOMER_EXTERNAL_ID_2,
        invoiceId: regularInvoiceId,
        metadata: {
          productId: "regularProductId",
        },
      },
    });
    expect(response1.status).toEqual(200);

    const premiumInvoiceId = `INV_${randomId()}`;
    const response2 = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        amount: 3000,
        customerExternalId: E2E_CUSTOMER_EXTERNAL_ID_2,
        invoiceId: premiumInvoiceId,
        metadata: {
          productId: "premiumProductId",
        },
      },
    });
    expect(response2.status).toEqual(200);

    await verifyCommission({
      http,
      invoiceId: regularInvoiceId,
      expectedAmount: response1.data.sale?.amount!,
      expectedEarnings: E2E_SALE_REWARD.amountInCents,
    });

    await verifyCommission({
      http,
      invoiceId: premiumInvoiceId,
      expectedAmount: response2.data.sale?.amount!,
      expectedEarnings: E2E_SALE_REWARD.modifiers[0].amountInCents!,
    });
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

  test("track a sale with direct sale tracking", async () => {
    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        domain: "getacme.link",
        key: "derek",
      },
    });
    expect(clickResponse.status).toEqual(200);
    expect(clickResponse.data.clickId).toStrictEqual(expect.any(String));
    const trackedClickId = clickResponse.data.clickId;
    const saleCustomer = randomCustomer();
    const salePayload = {
      ...sale,
      eventName: "Purchase (no lead event)",
      amount: randomSaleAmount(),
      invoiceId: `INV_${randomId()}`,
    };

    const response = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...salePayload,
        clickId: trackedClickId,
        leadEventName: "Signup (auto lead tracking)",
        customerExternalId: saleCustomer.externalId,
        customerName: saleCustomer.name,
        customerEmail: saleCustomer.email,
        customerAvatar: saleCustomer.avatar,
      },
    });

    expect(response.status).toEqual(200);
    expect(response.data).toStrictEqual({
      eventName: salePayload.eventName,
      customer: {
        id: expect.any(String),
        ...saleCustomer,
      },
      sale: {
        amount: salePayload.amount,
        currency: salePayload.currency,
        paymentProcessor: salePayload.paymentProcessor,
        invoiceId: salePayload.invoiceId,
        metadata: null,
      },
    });
  });

  test("track sales with different amounts (verifies sale amount is passed via context for reward conditions)", async () => {
    // Test with a small sale amount
    const smallSaleInvoiceId = `INV_${randomId()}`;
    const smallSaleAmount = 10000; // $100.00

    const response1 = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        amount: smallSaleAmount,
        customerExternalId: E2E_CUSTOMER_EXTERNAL_ID_2,
        invoiceId: smallSaleInvoiceId,
      },
    });

    expect(response1.status).toEqual(200);
    expect(response1.data.sale?.amount).toEqual(smallSaleAmount);

    // Test with a large sale amount
    const largeSaleInvoiceId = `INV_${randomId()}`;
    const largeSaleAmount = 20000; // $200.00

    const response2 = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        amount: largeSaleAmount,
        customerExternalId: E2E_CUSTOMER_EXTERNAL_ID_2,
        invoiceId: largeSaleInvoiceId,
      },
    });

    expect(response2.status).toEqual(200);
    expect(response2.data.sale?.amount).toEqual(largeSaleAmount);

    await verifyCommission({
      http,
      invoiceId: smallSaleInvoiceId,
      expectedAmount: response1.data.sale?.amount!,
      expectedEarnings: E2E_SALE_REWARD.amountInCents,
    });

    await verifyCommission({
      http,
      invoiceId: largeSaleInvoiceId,
      expectedAmount: response2.data.sale?.amount!,
      expectedEarnings: E2E_SALE_REWARD.modifiers[1].amountInCents!,
    });
  });
});
