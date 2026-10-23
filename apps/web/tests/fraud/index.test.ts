import { extractEmailDomain } from "@/lib/email/extract-email-domain";
import { Customer, TrackLeadResponse } from "@/lib/types";
import { CustomerEmailMatchType } from "@/lib/zod/schemas/fraud";
import { randomCustomer, randomId } from "tests/utils/helpers";
import {
  E2E_FRAUD_PARTNER,
  E2E_FRAUD_REFERRAL_SOURCE_BANNED_DOMAIN,
  E2E_PARTNERS,
  E2E_TRACK_CLICK_HEADERS,
} from "tests/utils/resource";
import { verifyFraudEvent } from "tests/utils/verify-fraud-event";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const randomEmailLocalPart = () =>
  `e2e${randomId(12)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()}`;

const randomUniqueEmail = (domain: string) =>
  `${randomEmailLocalPart()}@${domain}`;

describe.concurrent("/fraud/**", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  // Tracks a click on the link, then a signup lead for that click
  const trackLeadViaLink = async (
    link: { domain: string; key: string },
    customer: ReturnType<typeof randomCustomer>,
  ) => {
    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: { ...E2E_TRACK_CLICK_HEADERS },
      body: { domain: link.domain, key: link.key },
    });

    await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        eventName: "Signup",
        clickId: clickResponse.data.clickId,
        customerId: customer.externalId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
      },
    });
  };

  test("FraudRuleType = customerEmailMatch (exact match)", async () => {
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
      partner: E2E_FRAUD_PARTNER,
      customer,
      ruleType: "customerEmailMatch",
      metadata: {
        matchType: CustomerEmailMatchType.EXACT,
      },
    });
  });

  test("FraudRuleType = customerEmailMatch (domain match)", async () => {
    const clickLink = E2E_FRAUD_PARTNER.links.customerEmailMatch;

    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: { ...E2E_TRACK_CLICK_HEADERS },
      body: { domain: clickLink.domain, key: clickLink.key },
    });

    const partnerEmailDomain = extractEmailDomain(E2E_FRAUD_PARTNER.email)!;

    const customer = {
      ...randomCustomer(),
      email: randomUniqueEmail(partnerEmailDomain),
    };

    await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        eventName: "Signup",
        clickId: clickResponse.data.clickId,
        customerId: customer.externalId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
      },
    });

    await verifyFraudEvent({
      http,
      partner: E2E_FRAUD_PARTNER,
      customer,
      ruleType: "customerEmailMatch",
      metadata: {
        matchType: CustomerEmailMatchType.DOMAIN_MATCH,
      },
    });
  });

  test("FraudRuleType = customerEmailMatch (historical domain match)", async () => {
    const clickLink = E2E_FRAUD_PARTNER.links.customerEmailMatch;

    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: { ...E2E_TRACK_CLICK_HEADERS },
      body: { domain: clickLink.domain, key: clickLink.key },
    });

    const trackedClickId = clickResponse.data.clickId;

    const customer = {
      ...randomCustomer(),
      email: randomUniqueEmail("google.com"),
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
      partner: E2E_FRAUD_PARTNER,
      customer,
      ruleType: "customerEmailMatch",
      metadata: {
        matchType: CustomerEmailMatchType.HISTORICAL_DOMAIN_MATCH,
      },
    });
  });

  test("FraudRuleType = customerEmailMatch (similar email match)", async () => {
    const clickLink = E2E_FRAUD_PARTNER.links.customerEmailMatch;
    const localPart = randomEmailLocalPart();

    const firstCustomer = {
      ...randomCustomer(),
      email: `${localPart}@gmail.com`,
    };

    const similarCustomer = {
      ...randomCustomer(),
      email: `${localPart.split("").join(".")}@gmail.com`,
    };

    await trackLeadViaLink(clickLink, firstCustomer);
    await trackLeadViaLink(clickLink, similarCustomer);

    const { data: firstCustomers } = await http.get<Customer[]>({
      path: "/customers",
      query: { externalId: firstCustomer.externalId },
    });

    expect(firstCustomers.length).toBe(1);

    await verifyFraudEvent({
      http,
      partner: E2E_FRAUD_PARTNER,
      customer: similarCustomer,
      ruleType: "customerEmailMatch",
      metadata: {
        matchType: CustomerEmailMatchType.SIMILAR_EMAIL_MATCH,
        matchedCustomerId: firstCustomers[0].id,
      },
    });
  });

  test("FraudRuleType = customerEmailMatch (similar email match across partners)", async () => {
    const localPart = randomEmailLocalPart();

    const firstCustomer = {
      ...randomCustomer(),
      email: `${localPart}@gmail.com`,
    };

    const similarCustomer = {
      ...randomCustomer(),
      email: `${localPart}+2@gmail.com`,
    };

    // The first customer is referred by another partner in the same program
    await trackLeadViaLink(E2E_PARTNERS[0].shortLink, firstCustomer);
    await trackLeadViaLink(
      E2E_FRAUD_PARTNER.links.customerEmailMatch,
      similarCustomer,
    );

    const { data: firstCustomers } = await http.get<Customer[]>({
      path: "/customers",
      query: { externalId: firstCustomer.externalId },
    });

    expect(firstCustomers.length).toBe(1);

    await verifyFraudEvent({
      http,
      partner: E2E_FRAUD_PARTNER,
      customer: similarCustomer,
      ruleType: "customerEmailMatch",
      metadata: {
        matchType: CustomerEmailMatchType.SIMILAR_EMAIL_MATCH,
        matchedCustomerId: firstCustomers[0].id,
      },
    });

    // Only the later variant is flagged, not the original customer
    const { status, data: firstCustomerEvents } = await http.get<unknown[]>({
      path: "/fraud/events",
      query: {
        customerId: firstCustomers[0].id,
        type: "customerEmailMatch",
      },
    });

    expect(status).toEqual(200);
    expect(firstCustomerEvents).toEqual([]);
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
      partner: E2E_FRAUD_PARTNER,
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
      partner: E2E_FRAUD_PARTNER,
      ruleType: "referralSourceBanned",
      metadata: {
        source: E2E_FRAUD_REFERRAL_SOURCE_BANNED_DOMAIN,
      },
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
      partner: E2E_FRAUD_PARTNER,
      customer,
      ruleType: "paidTrafficDetected",
      metadata: {
        source: "google",
        url: "https://dub.co/paid-traffic?gclid=1234567890&gad_source=1",
      },
    });
  });
});
