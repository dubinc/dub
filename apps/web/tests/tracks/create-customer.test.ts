import { trackCustomerResponseSchema } from "@/lib/zod/schemas/customers";
import { nanoid } from "@dub/utils";
import { Tag } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe.skip("POST /track/customer", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("with required params", async () => {
    const customer = {
      customerId: nanoid(16),
    };

    const response = await http.post<Tag>({
      path: "/track/customer",
      body: {
        customerId: customer.customerId,
      },
    });

    const parsed = trackCustomerResponseSchema.safeParse(response.data);

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
    const customer = {
      customerId: nanoid(16),
      customerName: "David",
      customerEmail: "david@example.com",
      customerAvatar: "https://example.com/david.jpeg",
    };

    const response = await http.post<Tag>({
      path: "/track/customer",
      body: customer,
    });

    const parsed = trackCustomerResponseSchema.safeParse(response.data);

    expect(parsed.success).toBe(true);
    expect(response.status).toEqual(201);
    expect(response.data).toStrictEqual(customer);
  });
});
