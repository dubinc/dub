import { expect } from "vitest";
import { E2E_TRACK_CLICK_HEADERS } from "../../utils/resource";

export async function trackE2ELead(
  http: any,
  partnerLink: { domain: string; key: string },
) {
  const { status: clickStatus, data: clickData } = await http.post({
    path: "/track/click",
    headers: E2E_TRACK_CLICK_HEADERS,
    body: {
      domain: partnerLink.domain,
      key: partnerLink.key,
    },
  });

  expect(clickStatus).toEqual(200);
  expect(clickData.clickId).toBeDefined();

  const { status: leadStatus } = await http.post({
    path: "/track/lead",
    body: {
      clickId: clickData.clickId,
      eventName: `Signup-${Date.now()}`,
      customerExternalId: `e2e-customer-${Date.now()}`,
      customerEmail: `customer@example.com`,
    },
  });

  expect(leadStatus).toEqual(200);
}
