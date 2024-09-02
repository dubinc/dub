import { TrackLeadResponse } from "@/lib/types";
import { randomCustomer } from "tests/utils/helpers";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe("POST /track/lead", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();
  const customer = randomCustomer();
  const clickId = "avYirXJbt3gGALMk"; // TODO: Replace this with a valid clickId

  test("track a lead", async () => {
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId,
        eventName: "Signup",
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
      },
    });

    expect(response.status).toEqual(200);
    expect(response.data).toStrictEqual({
      clickId,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerAvatar: customer.avatar,
      click: {
        id: clickId,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        avatar: customer.avatar,
      },
    });
  });

  test("duplicate request with same customerId", async () => {
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId,
        eventName: "Signup",
        customerId: customer.id,
      },
    });

    expect(response.status).toEqual(429);
    expect(response.data).toStrictEqual({
      error: {
        code: "rate_limit_exceeded",
        doc_url: "https://dub.co/docs/api-reference/errors#rate-limit_exceeded",
        message: `Rate limit exceeded for customer ${customer.id}: Signup`,
      },
    });
  });
});
