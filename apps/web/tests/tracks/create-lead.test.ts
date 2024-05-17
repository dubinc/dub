import { trackLeadResponseSchema } from "@/lib/zod/schemas/leads";
import { Tag } from "@prisma/client";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const customer = {
  customerId: "david",
  customerName: "David",
  customerEmail: "david@example.com",
  customerAvatar: "https://example.com/david.jpeg",
  metadata: { plan: "enterprise" },
};

test.skip("POST /track/lead", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;
  const clickId = "uxdcuMfBa5Nqnbwk";

  // With required params
  let response = await http.post<Tag>({
    path: "/track/lead",
    query: { workspaceId },
    body: {
      clickId,
      eventName: "Signup",
      customerId: customer.customerId,
    },
  });

  let parsed = trackLeadResponseSchema.safeParse(response.data);

  expect(parsed.success).toBe(true);
  expect(response.status).toEqual(201);
  expect(response.data).toStrictEqual({
    clickId,
    eventName: "Signup",
    customerId: customer.customerId,
    customerName: null,
    customerEmail: null,
    customerAvatar: null,
    metadata: null,
  });

  // With all params
  response = await http.post<Tag>({
    path: "/track/lead",
    query: { workspaceId },
    body: {
      clickId,
      eventName: "Signup",
      ...customer,
    },
  });

  parsed = trackLeadResponseSchema.safeParse(response.data);

  expect(parsed.success).toBe(true);
  expect(response.status).toEqual(201);
  expect(response.data).toStrictEqual({
    clickId,
    eventName: "Signup",
    ...customer,
  });
});
