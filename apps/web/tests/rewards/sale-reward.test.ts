import { TrackSaleResponse } from "@/lib/types";
import { randomId } from "tests/utils/helpers";
import { E2E_CUSTOMERS, E2E_SALE_REWARD } from "tests/utils/resource";
import { verifyCommission } from "tests/utils/verify-commission";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe.concurrent("Sale rewards", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("when {Customer} {Country} is {SG}", async () => {
    const saleAmount = 10000; // $100 in cents
    const invoiceId = `INV_${randomId()}`;

    // Track the sale
    const trackSaleResponse = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        customerExternalId: E2E_CUSTOMERS[0].externalId,
        eventName: "Subscription",
        amount: saleAmount,
        currency: "usd",
        invoiceId,
        paymentProcessor: "stripe",
      },
    });

    expect(trackSaleResponse.status).toEqual(200);

    // Verify the commission (10% of sale amount)
    await verifyCommission({
      http,
      invoiceId,
      expectedEarnings: saleAmount * 0.1,
    });
  });

  test.skip("when {Customer} {Country} is {CA}", async () => {
    const saleAmount = 10000; // $100 in cents
    const invoiceId = `INV_${randomId()}`;

    // Track the sale
    const trackSaleResponse = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        customerExternalId: E2E_CUSTOMERS[1].externalId,
        eventName: "Subscription",
        amount: saleAmount,
        currency: "usd",
        invoiceId,
        paymentProcessor: "stripe",
      },
    });

    expect(trackSaleResponse.status).toEqual(200);

    // Verify the commission (base reward)
    await verifyCommission({
      http,
      invoiceId,
      expectedEarnings: E2E_SALE_REWARD.amountInCents,
    });
  });
});
