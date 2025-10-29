import { TrackLeadResponse } from "@/lib/types";
import { randomCustomer } from "tests/utils/helpers";
import {
  E2E_LEAD_REWARD,
  E2E_PARTNERS,
  E2E_TRACK_CLICK_HEADERS,
} from "tests/utils/resource";
import { verifyCommission } from "tests/utils/verify-commission";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe.concurrent("Lead rewards", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("when customer country is US and partner country is US", async () => {
    // Track the click
    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        ...E2E_PARTNERS[0].shortLink,
      },
    });

    expect(clickResponse.status).toEqual(200);

    const clickId = clickResponse.data.clickId;
    const customer = randomCustomer();

    // Track the lead
    const trackLeadResponse = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId,
        eventName: "Signup",
        customerExternalId: customer.externalId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
      },
    });

    expect(trackLeadResponse.status).toEqual(200);

    // Verify the commission
    await verifyCommission({
      http,
      customerExternalId: customer.externalId,
      expectedEarnings: E2E_LEAD_REWARD.modifiers[1].amountInCents,
    });
  });

  test("when customer country is US and partner country is not US", async () => {
    // Track the click
    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        ...E2E_PARTNERS[1].shortLink,
      },
    });

    expect(clickResponse.status).toEqual(200);

    const clickId = clickResponse.data.clickId;
    const customer = randomCustomer();

    // Track the lead
    const trackLeadResponse = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId,
        eventName: "Signup",
        customerExternalId: customer.externalId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
      },
    });

    expect(trackLeadResponse.status).toEqual(200);

    // Verify the commission
    await verifyCommission({
      http,
      customerExternalId: customer.externalId,
      expectedEarnings: E2E_LEAD_REWARD.modifiers[0].amountInCents,
    });
  });
});
