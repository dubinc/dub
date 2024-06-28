import { trackLeadResponseSchema } from "@/lib/zod/schemas/leads";
import { Tag } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const customer = {
  customerId: "david",
  customerName: "David",
  customerEmail: "david@example.com",
  customerAvatar: "https://example.com/david.jpeg",
  metadata: { plan: "enterprise" },
};

describe.skip("POST /track/lead", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();
  const clickId = "uxdcuMfBa5Nqnbwk";

  test("with required params", async () => {
    const response = await http.post<Tag>({
      path: "/track/lead",
      body: {
        clickId,
        eventName: "Signup",
        customerId: customer.customerId,
      },
    });

    const parsed = trackLeadResponseSchema.safeParse(response.data);

    expect(parsed.success).toBe(true);
    expect(response.status).toEqual(200);
    expect(response.data).toStrictEqual({
      clickId,
      eventName: "Signup",
      customerId: customer.customerId,
      customerName: null,
      customerEmail: null,
      customerAvatar: null,
      metadata: null,
    });
  });

  test("with all params", async () => {
    const response = await http.post<Tag>({
      path: "/track/lead",
      body: {
        clickId,
        eventName: "Signup",
        ...customer,
      },
    });

    const parsed = trackLeadResponseSchema.safeParse(response.data);

    expect(parsed.success).toBe(true);
    expect(response.status).toEqual(200);
    expect(response.data).toStrictEqual({
      clickId,
      eventName: "Signup",
      ...customer,
    });
  });
});
