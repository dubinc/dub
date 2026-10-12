import { expect } from "vitest";
import { E2E_TRACK_CLICK_HEADERS } from "../../utils/resource";

export async function trackE2ELead(
  http: any,
  partnerLink: { domain: string; key: string },
  overrides?: {
    customerExternalId?: string;
    customerEmail?: string;
  },
) {
  const customerExternalId =
    overrides?.customerExternalId ?? `e2e-customer-${Date.now()}`;
  const customerEmail =
    overrides?.customerEmail ?? `${customerExternalId}@example.com`;

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
      customerExternalId,
      customerEmail,
    },
  });

  expect(leadStatus).toEqual(200);

  return {
    customerExternalId,
    customerEmail,
    clickId: clickData.clickId as string,
  };
}
