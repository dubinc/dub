import { expect } from "vitest";
import { E2E_TRACK_CLICK_HEADERS } from "../../utils/resource";

export async function trackLeads(
  http: any,
  partnerLink: { domain: string; key: string },
  count: number,
) {
  for (let i = 0; i < count; i++) {
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
        eventName: `Signup-${i}-${Date.now()}`,
        customerExternalId: `e2e-customer-${i}-${Date.now()}`,
        customerEmail: `customer${i}@example.com`,
      },
    });

    expect(leadStatus).toEqual(200);

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
