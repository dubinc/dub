import { TrackSaleResponse } from "@/lib/types";
import { randomId, randomSaleAmount } from "tests/utils/helpers";
import {
  E2E_CUSTOMER_EXTERNAL_ID_2,
  E2E_CUSTOMER_ID,
  E2E_CUSTOMER_SG_EXTERNAL_ID,
  E2E_SALE_REWARD,
} from "tests/utils/resource";
import { verifyCommission } from "tests/utils/verify-commission";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe.concurrent("Sale rewards with conditions", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  const randomSale = () => ({
    eventName: "Subscription",
    currency: "usd",
    paymentProcessor: "stripe",
    amount: randomSaleAmount(),
    invoiceId: `INV_${randomId()}`,
  });

  test("When {Sale} {Product ID} is {regularProductId}", async () => {
    const sale = randomSale();

    const response = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        customerExternalId: E2E_CUSTOMER_EXTERNAL_ID_2,
        metadata: {
          productId: "regularProductId",
        },
      },
    });

    expect(response.status).toEqual(200);

    await verifyCommission({
      http,
      invoiceId: sale.invoiceId,
      expectedEarnings: E2E_SALE_REWARD.amountInCents,
    });
  });

  test("When {Sale} {Product ID} is {premiumProductId}", async () => {
    const sale = randomSale();

    const response = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        customerExternalId: E2E_CUSTOMER_EXTERNAL_ID_2,
        metadata: {
          productId: "premiumProductId",
        },
      },
    });

    expect(response.status).toEqual(200);

    await verifyCommission({
      http,
      invoiceId: sale.invoiceId,
      expectedEarnings: E2E_SALE_REWARD.modifiers[0].amountInCents!,
    });
  });

  test("When {Sale} {Amount} is greater than {15000}", async () => {
    const sale = randomSale();

    const response = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        amount: 17500,
        customerExternalId: E2E_CUSTOMER_EXTERNAL_ID_2,
        metadata: {
          productId: "premiumProductId",
        },
      },
    });

    expect(response.status).toEqual(200);

    await verifyCommission({
      http,
      invoiceId: sale.invoiceId,
      expectedEarnings: E2E_SALE_REWARD.modifiers[1].amountInCents!,
    });
  });

  test("when {Customer} {Country} is {SG}", async () => {
    const sale = randomSale();

    const trackSaleResponse = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        customerExternalId: E2E_CUSTOMER_SG_EXTERNAL_ID,
      },
    });

    expect(trackSaleResponse.status).toEqual(200);

    await verifyCommission({
      http,
      invoiceId: sale.invoiceId,
      expectedEarnings: E2E_SALE_REWARD.modifiers[2].amountInCents!,
    });
  });

  test("when {Customer} {Subscription Duration} is greater than {12}", async () => {
    const sale = randomSale();

    const trackSaleResponse = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        ...sale,
        customerExternalId: E2E_CUSTOMER_ID,
      },
    });

    expect(trackSaleResponse.status).toEqual(200);

    await verifyCommission({
      http,
      invoiceId: sale.invoiceId,
      expectedEarnings: E2E_SALE_REWARD.modifiers[3].amountInCents!,
    });
  });
});
