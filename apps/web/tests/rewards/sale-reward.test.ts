import { TrackLeadResponse, TrackSaleResponse } from "@/lib/types";
import {
  randomCustomer,
  randomId,
  randomSaleAmount,
} from "tests/utils/helpers";
import {
  E2E_CUSTOMER_COUNTRY_CONDITIONS_EXTERNAL_ID,
  E2E_CUSTOMER_SALE_CONDITIONS_EXTERNAL_ID,
  E2E_CUSTOMER_SIGNUP_DATE_CONDITIONS_EXTERNAL_ID,
  E2E_SALE_REWARD,
  E2E_TRACK_CLICK_HEADERS,
} from "tests/utils/resource";
import { verifyCommission } from "tests/utils/verify-commission";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe("Sale rewards with conditions", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  const randomSale = (eventName = "Payment") => ({
    eventName,
    currency: "usd",
    paymentProcessor: "stripe",
    amount: randomSaleAmount(),
    invoiceId: `INV_${randomId()}`,
  });

  describe.concurrent("concurrent track/sale tests", () => {
    test("When {Sale} {Product ID} is {regularProductId}", async () => {
      const sale = randomSale("E2E base condition");

      const response = await http.post<TrackSaleResponse>({
        path: "/track/sale",
        body: {
          ...sale,
          customerExternalId: E2E_CUSTOMER_SALE_CONDITIONS_EXTERNAL_ID,
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
      const sale = randomSale("E2E sale product ID condition");

      const response = await http.post<TrackSaleResponse>({
        path: "/track/sale",
        body: {
          ...sale,
          customerExternalId: E2E_CUSTOMER_SALE_CONDITIONS_EXTERNAL_ID,
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
      const sale = randomSale("E2E sale amount condition");

      const response = await http.post<TrackSaleResponse>({
        path: "/track/sale",
        body: {
          ...sale,
          amount: 17500,
          customerExternalId: E2E_CUSTOMER_SALE_CONDITIONS_EXTERNAL_ID,
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
      const sale = randomSale("E2E customer country condition");

      const trackSaleResponse = await http.post<TrackSaleResponse>({
        path: "/track/sale",
        body: {
          ...sale,
          customerExternalId: E2E_CUSTOMER_COUNTRY_CONDITIONS_EXTERNAL_ID,
        },
      });

      expect(trackSaleResponse.status).toEqual(200);

      await verifyCommission({
        http,
        invoiceId: sale.invoiceId,
        expectedEarnings: E2E_SALE_REWARD.modifiers[2].amountInCents!,
      });
    });

    test("when {Customer} {Signup Date} is {greater than} {Feb 16, 2026} AND {less than} {Feb 18, 2026}", async () => {
      const sale = randomSale("E2E customer signup date condition");

      const trackSaleResponse = await http.post<TrackSaleResponse>({
        path: "/track/sale",
        body: {
          ...sale,
          customerExternalId: E2E_CUSTOMER_SIGNUP_DATE_CONDITIONS_EXTERNAL_ID,
        },
      });

      expect(trackSaleResponse.status).toEqual(200);

      await verifyCommission({
        http,
        invoiceId: sale.invoiceId,
        expectedEarnings: E2E_SALE_REWARD.modifiers[4].amountInCents!,
      });
    });
  });

  const newCustomer = randomCustomer();

  describe.sequential("sequential track/sale tests", () => {
    test("when {Sale} {Type} is {new} vs {recurring}", async () => {
      const clickResponse = await http.post<{ clickId: string }>({
        path: "/track/click",
        headers: E2E_TRACK_CLICK_HEADERS,
        body: {
          domain: "getacme.link",
          key: "marvin",
        },
      });
      expect(clickResponse.status).toEqual(200);
      const trackedClickId = clickResponse.data.clickId;
      expect(trackedClickId).toStrictEqual(expect.any(String));

      const trackLeadResponse = await http.post<TrackLeadResponse>({
        path: "/track/lead",
        body: {
          clickId: trackedClickId,
          eventName: "E2E lead for new/recurring sale test",
          customerExternalId: newCustomer.externalId,
          customerName: newCustomer.name,
          customerEmail: newCustomer.email,
          customerAvatar: newCustomer.avatar,
          mode: "wait",
        },
      });

      expect(trackLeadResponse.status).toEqual(200);

      const sale = randomSale("E2E first sale");

      const trackSaleResponse = await http.post<TrackSaleResponse>({
        path: "/track/sale",
        body: {
          ...sale,
          customerExternalId: newCustomer.externalId,
        },
      });

      expect(trackSaleResponse.status).toEqual(200);

      await new Promise((resolve) => setTimeout(resolve, 3000));

      await verifyCommission({
        http,
        invoiceId: sale.invoiceId,
        expectedEarnings: E2E_SALE_REWARD.modifiers[5].amountInCents!,
      });

      // no need to verify second sale since it will be verified below
      // in the {Customer} {Subscription Duration} is {less than or equal to} {3} test
    });

    test("when {Customer} {Subscription Duration} is {less than or equal to} {3}", async () => {
      const sale = randomSale("E2E customer subscription duration condition");
      const trackSaleResponse = await http.post<TrackSaleResponse>({
        path: "/track/sale",
        body: {
          ...sale,
          customerExternalId: newCustomer.externalId,
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
});
