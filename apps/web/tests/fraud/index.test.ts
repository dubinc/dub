import { Customer, fraudEventGroupProps, TrackLeadResponse } from "@/lib/types";
import { FraudRuleType } from "@prisma/client";
import { randomCustomer, randomId } from "tests/utils/helpers";
import { HttpClient } from "tests/utils/http";
import {
  DUB_TEST_IDENTITY_HEADER,
  E2E_FRAUD_PARTNER,
  E2E_FRAUD_REFERRAL_SOURCE_BANNED_DOMAIN,
  E2E_TRACK_CLICK_HEADERS,
} from "tests/utils/resource";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe.skip.concurrent("/fraud/**", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("FraudRuleType = customerEmailMatch", async () => {
    const clickLink = E2E_FRAUD_PARTNER.link;

    // Track a click
    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: {
        ...E2E_TRACK_CLICK_HEADERS,
        [DUB_TEST_IDENTITY_HEADER]: randomId(10),
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
    const clickLink = E2E_FRAUD_PARTNER.link;

    // Track a click
    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: {
        ...E2E_TRACK_CLICK_HEADERS,
        [DUB_TEST_IDENTITY_HEADER]: randomId(10),
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
    const clickLink = E2E_FRAUD_PARTNER.link;

    // Track a click
    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: {
        ...E2E_TRACK_CLICK_HEADERS,
        referer: `https://${E2E_FRAUD_REFERRAL_SOURCE_BANNED_DOMAIN}`,
        [DUB_TEST_IDENTITY_HEADER]: randomId(10),
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
    const clickLink = E2E_FRAUD_PARTNER.link;

    // Track a click
    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: {
        ...E2E_TRACK_CLICK_HEADERS,
        [DUB_TEST_IDENTITY_HEADER]: randomId(10),
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
  customer: Pick<Customer, "externalId" | "name" | "email">;
  ruleType: FraudRuleType;
}) => {
  // Wait for 8 seconds to reduce flakiness
  await new Promise((resolve) => setTimeout(resolve, 8000));

  // Resolve customerId from customerExternalID
  const { data: customers } = await http.get<Customer[]>({
    path: "/customers",
    query: { externalId: customer.externalId },
  });

  expect(customers.length).toBeGreaterThan(0);

  const customerFound = customers[0];

  // Fetch fraud events for the current customer
  const { data: fraudEvents } = await http.get<fraudEventGroupProps[]>({
    path: "/fraud/events",
    query: {
      partnerId: E2E_FRAUD_PARTNER.id,
      type: ruleType,
      customerId: customerFound.id,
    },
  });

  expect(fraudEvents.length).toBeGreaterThan(0);

  const fraudEvent = fraudEvents[0];

  expect(fraudEvent).toStrictEqual({
    id: expect.any(String),
    type: ruleType,
    status: "pending",
    resolutionReason: null,
    resolvedAt: null,
    lastOccurrenceAt: expect.any(String),
    count: 1,
    groupKey: expect.any(String),
    partner: {
      id: E2E_FRAUD_PARTNER.id,
      name: expect.any(String),
      email: expect.any(String),
      image: null,
    },
    customer: {
      id: customerFound.id,
      name: expect.any(String),
      email: expect.any(String),
    },
    user: null,
  });
};
