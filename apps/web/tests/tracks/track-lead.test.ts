import { TrackLeadResponse } from "@/lib/types";
import { randomCustomer } from "tests/utils/helpers";
import { E2E_CLICK_ID } from "tests/utils/resource";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe("POST /track/lead", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();
  const customer = randomCustomer();

  test("track a lead", async () => {
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: E2E_CLICK_ID,
        eventName: "Signup",
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
      },
    });

    expect(response.status).toEqual(200);
    expect(response.data).toStrictEqual({
      clickId: E2E_CLICK_ID,
      customerName: customer.name,
      customerEmail: customer.email,
      customerAvatar: customer.avatar,
      click: {
        id: E2E_CLICK_ID,
      },
      customer: {
        name: customer.name,
        email: customer.email,
        avatar: customer.avatar,
        externalId: customer.id,
      },
    });
  });

  test("duplicate request with same customerId", async () => {
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: E2E_CLICK_ID,
        eventName: "Signup",
        customerId: customer.id,
      },
    });

    expect(response.status).toEqual(409);
    expect(response.data).toStrictEqual({
      error: {
        code: "conflict",
        doc_url: "https://dub.co/docs/api-reference/errors#conflict",
        message: `Customer with externalId ${customer.id} and event name Signup has already been recorded.`,
      },
    });
  });
});
