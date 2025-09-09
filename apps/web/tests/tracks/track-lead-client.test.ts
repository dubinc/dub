import { randomCustomer } from "tests/utils/helpers";
import { E2E_TRACK_CLICK_HEADERS } from "tests/utils/resource";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe("POST /track/lead/client", async () => {
  const h = new IntegrationHarness();
  const { http, env } = await h.init();

  // Track a click
  const clickResponse = await http.post<{ clickId: string }>({
    path: "/track/click",
    headers: E2E_TRACK_CLICK_HEADERS,
    body: {
      domain: "getacme.link",
      key: "derek",
    },
  });

  expect(clickResponse.status).toEqual(200);
  expect(clickResponse.data.clickId).toStrictEqual(expect.any(String));

  const clickId = clickResponse.data.clickId;
  const customer = randomCustomer();

  test("track a lead (with clickId from a prior /track/lead/client request)", async () => {
    const response = await fetch(`${env.E2E_BASE_URL}/api/track/lead/client`, {
      method: "POST",
      headers: {
        ...E2E_TRACK_CLICK_HEADERS,
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.E2E_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        clickId: clickId,
        eventName: "Signup",
        customerExternalId: customer.externalId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
      }),
    });

    const leadResponse = await response.json();

    expect(response.status).toEqual(200);
    expect(leadResponse).toStrictEqual({
      click: {
        id: clickId,
      },
      customer: customer,
    });
  });
});
