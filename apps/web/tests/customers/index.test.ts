import { Customer } from "@/lib/types";
import { CustomerEnrichedSchema } from "@/lib/zod/schemas/customers";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const expectedCustomer = {
  id: "cus_n5LF7wS3Z1vfwjZCyy5QDC7Q",
  externalId: "cus_OmLauTvvWCtJsFN1yJb0oevj",
  email: "abundant.coral.platypus@example.com",
  country: "US",
  name: expect.any(String),
  avatar: expect.any(String),
  createdAt: expect.any(String),
};

describe.sequential("/customers/**", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  const customerId = expectedCustomer.id;

  test("GET /customers/{id}", async () => {
    const { status, data: retrievedCustomer } = await http.get<Customer>({
      path: `/customers/${customerId}`,
    });

    expect(status).toEqual(200);
    expect(retrievedCustomer).toStrictEqual(expectedCustomer);
  });

  test("GET /customers", async () => {
    const { status, data: customers } = await http.get<Customer[]>({
      path: `/customers?email=${expectedCustomer.email}`,
    });

    expect(status).toEqual(200);
    expect(customers.length).toBeGreaterThanOrEqual(1);
    expect(customers[0]).toStrictEqual(expectedCustomer);
  });

  test("PATCH /customers/{id}", async () => {
    const toUpdate = {
      name: "Updated",
      avatar: "https://www.gravatar.com/avatar/1234567890",
    };

    const { status, data: customer } = await http.patch<Customer>({
      path: `/customers/${customerId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(customer).toStrictEqual({
      ...expectedCustomer,
      ...toUpdate,
    });
  });

  test("GET /customers by externalId with includeExpandedFields", async () => {
    const { status, data: customers } = await http.get<Customer[]>({
      path: `/customers?externalId=${expectedCustomer.externalId}&includeExpandedFields=true`,
    });

    expect(status).toEqual(200);
    expect(customers.length).toBeGreaterThanOrEqual(1);
    expect(
      CustomerEnrichedSchema.parse({
        ...customers[0],
        createdAt: new Date(customers[0].createdAt),
      }),
    ).toBeTruthy();
  });
});
