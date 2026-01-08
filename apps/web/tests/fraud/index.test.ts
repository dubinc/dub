import { Customer, TrackLeadResponse } from "@/lib/types";
import { fraudEventSchemas } from "@/lib/zod/schemas/fraud";
import { FraudRuleType } from "@dub/prisma/client";
import { randomCustomer, retry } from "tests/utils/helpers";
import { HttpClient } from "tests/utils/http";
import {
  E2E_FRAUD_PARTNER,
  E2E_FRAUD_REFERRAL_SOURCE_BANNED_DOMAIN,
  E2E_TRACK_CLICK_HEADERS,
} from "tests/utils/resource";
import { describe, expect, test } from "vitest";
import * as z from "zod/v4";
import { IntegrationHarness } from "../utils/integration";

describe.concurrent("/fraud/**", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("FraudRuleType = customerEmailMatch", async () => {
    const clickLink = E2E_FRAUD_PARTNER.links.customerEmailMatch;

    // Track a click
    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: {
        ...E2E_TRACK_CLICK_HEADERS,
      },
      body: {
        domain: clickLink.domain,
        key: clickLink.key,
      },
    });

    const trackedClickId = clickResponse.data.clickId;

    // Track a lead
    const customer = {
      ...randomCustomer(),
      email: E2E_FRAUD_PARTNER.email, // same email as partner
    };

    await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        eventName: "Signup",
        clickId: trackedClickId,
        customerId: customer.externalId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
      },
    });

    await verifyFraudEvent({
      http,
      customer,
      ruleType: "customerEmailMatch",
    });
  });

  test("FraudRuleType = customerEmailSuspiciousDomain", async () => {
    const clickLink = E2E_FRAUD_PARTNER.links.customerEmailSuspiciousDomain;

    // Track a click
    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: {
        ...E2E_TRACK_CLICK_HEADERS,
      },
      body: {
        domain: clickLink.domain,
        key: clickLink.key,
      },
    });

    const trackedClickId = clickResponse.data.clickId;

    // Track a lead
    const customer = randomCustomer({ emailDomain: "email-temp.com" });

    await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        eventName: "Signup",
        clickId: trackedClickId,
        customerId: customer.externalId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
      },
    });

    await verifyFraudEvent({
      http,
      customer,
      ruleType: "customerEmailSuspiciousDomain",
    });
  });

  test("FraudRuleType = referralSourceBanned", async () => {
    const clickLink = E2E_FRAUD_PARTNER.links.referralSourceBanned;

    // Track a click
    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: {
        ...E2E_TRACK_CLICK_HEADERS,
        referer: `https://${E2E_FRAUD_REFERRAL_SOURCE_BANNED_DOMAIN}`,
      },
      body: {
        domain: clickLink.domain,
        key: clickLink.key,
      },
    });

    const trackedClickId = clickResponse.data.clickId;

    // Track a lead
    const customer = randomCustomer();

    await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        eventName: "Signup",
        clickId: trackedClickId,
        customerId: customer.externalId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
      },
    });

    await verifyFraudEvent({
      http,
      customer,
      ruleType: "referralSourceBanned",
    });
  });

  test("FraudRuleType = paidTrafficDetected", async () => {
    const clickLink = E2E_FRAUD_PARTNER.links.paidTrafficDetected;

    // Track a click
    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: {
        ...E2E_TRACK_CLICK_HEADERS,
      },
      body: {
        domain: clickLink.domain,
        key: clickLink.key,
        url: "https://dub.co/paid-traffic?gclid=1234567890&gad_source=1",
      },
    });

    const trackedClickId = clickResponse.data.clickId;

    // Track a lead
    const customer = randomCustomer();

    await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        eventName: "Signup",
        clickId: trackedClickId,
        customerId: customer.externalId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
      },
    });

    await verifyFraudEvent({
      http,
      customer,
      ruleType: "paidTrafficDetected",
    });
  });
});

const verifyFraudEvent = async ({
  http,
  customer,
  ruleType,
}: {
  http: HttpClient;
  customer: Pick<Customer, "externalId">;
  ruleType: FraudRuleType;
}) => {
  // Resolve customerId from customerExternalID
  const { data: customers } = await http.get<Customer[]>({
    path: "/customers",
    query: { externalId: customer.externalId },
  });

  expect(customers.length).toBeGreaterThan(0);

  // Wait until fraud event is available
  const fraudEvent = await waitForFraudEvent({
    http,
    customerId: customers[0].id,
    ruleType,
  });

  // Assert fraud event shape
  expect(fraudEvent).toStrictEqual({
    createdAt: expect.any(String),
    customer: expect.objectContaining({
      id: customers[0].id,
      name: customers[0].name,
      email: customers[0].email,
      avatar: customers[0].avatar,
    }),
    ...(ruleType === "paidTrafficDetected" && {
      metadata: {
        source: "google",
        url: "https://dub.co/paid-traffic?gclid=1234567890&gad_source=1",
      },
    }),
    ...(ruleType === "referralSourceBanned" && {
      metadata: {
        source: E2E_FRAUD_REFERRAL_SOURCE_BANNED_DOMAIN,
      },
    }),
  });
};

async function waitForFraudEvent({
  http,
  customerId,
  ruleType,
}: {
  http: HttpClient;
  customerId: string;
  ruleType: FraudRuleType;
}) {
  return await retry(
    async () => {
      const { data } = await http.get<
        z.infer<(typeof fraudEventSchemas)[keyof typeof fraudEventSchemas]>[]
      >({
        path: "/fraud/events",
        query: {
          customerId,
          type: ruleType,
        },
      });

      if (!data.length) {
        throw new Error("Fraud event not ready.");
      }

      return data[0];
    },
    { retries: 10, interval: 600 },
  );
}
