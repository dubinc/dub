import { trackCustomerResponsetSchema } from "@/lib/zod/schemas/customers";
import { Tag } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const customer = {
  customerId: "david",
  customerName: "David",
  customerEmail: "david@example.com",
  customerAvatar: "https://example.com/david.jpeg",
};

describe.skip("POST /track/customer", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  test("with required params", async () => {
    const response = await http.post<Tag>({
      path: "/track/customer",
      query: { workspaceId },
      body: {
        customerId: customer.customerId,
      },
    });

    const parsed = trackCustomerResponsetSchema.safeParse(response.data);

    expect(parsed.success).toBe(true);
    expect(response.status).toEqual(201);
    expect(response.data).toStrictEqual({
      customerId: customer.customerId,
      customerName: null,
      customerEmail: null,
      customerAvatar: null,
    });
  });

  test("with all params", async () => {
    const response = await http.post<Tag>({
      path: "/track/customer",
      query: { workspaceId },
      body: customer,
    });

    const parsed = trackCustomerResponsetSchema.safeParse(response.data);

    expect(parsed.success).toBe(true);
    expect(response.status).toEqual(201);
    expect(response.data).toStrictEqual(customer);
  });
});
