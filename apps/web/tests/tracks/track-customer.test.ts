import { TrackCustomerResponse } from "@/lib/types";
import { randomCustomer } from "tests/utils/helpers";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe("POST /track/customer", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();
  const customer = randomCustomer();

  test("create a new customer", async () => {
    const response = await http.post<TrackCustomerResponse>({
      path: "/track/customer",
      body: {
        customerId: customer.id, // We're only required params
      },
    });

    expect(response.status).toEqual(200);
    expect(response.data).toStrictEqual({
      customerId: customer.id,
      customerName: expect.any(String),
      customerEmail: null,
      customerAvatar: null,
    });
  });

  test("update an existing customer", async () => {
    const updatedCustomer = {
      customerName: "David",
      customerEmail: "david@example.com",
      customerAvatar: "https://example.com/david.png",
    };

    const response = await http.post<TrackCustomerResponse>({
      path: "/track/customer",
      body: {
        customerId: customer.id,
        ...updatedCustomer,
      },
    });

    expect(response.status).toEqual(200);
    expect(response.data).toStrictEqual({
      customerId: customer.id,
      ...updatedCustomer,
    });
  });
});
