import { Customer } from "@/lib/types";
import { afterAll, describe, expect, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";

const externalId = `cust_${randomId()}`;

const customerRecord = {
  externalId,
  name: "John Doe",
  email: `${externalId}@example.com`,
  avatar: `https://www.gravatar.com/avatar/${externalId}`,
};

const expectedCustomer = {
  id: expect.any(String),
  externalId: customerRecord.externalId,
  name: customerRecord.name,
  email: customerRecord.email,
  avatar: customerRecord.avatar,
  createdAt: expect.any(String),
};

describe.sequential("/customers/**", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let customerId: string;

  afterAll(async () => {
    await h.deleteCustomer(customerId);
  });

  test("POST /customers", async () => {
    const { status, data: customer } = await http.post<Customer>({
      path: "/customers",
      body: customerRecord,
    });

    expect(status).toEqual(201);
    expect(customer).toStrictEqual(expectedCustomer);

    customerId = customer.id;
  });

  test("GET /customers/{id}", async () => {
    const { status, data: customer } = await http.get<Customer>({
      path: `/customers/${customerId}`,
    });

    expect(status).toEqual(200);
    expect(customer).toStrictEqual(expectedCustomer);
  });

  test("GET /customers", async () => {
    const { status, data: customers } = await http.get<Customer[]>({
      path: "/customers",
    });

    const customerFound = customers.find(
      (c) => c.externalId === customerRecord.externalId,
    );

    expect(status).toEqual(200);
    expect(customers.length).toBeGreaterThanOrEqual(1);
    expect(customerFound).toStrictEqual(expectedCustomer);
  });

  test("PATCH /customers/{id}", async () => {
    const toUpdate = {
      email: `${externalId}@example.co`,
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

  test("DELETE /customers/{id}", async () => {
    const { status, data } = await http.delete({
      path: `/customers/${customerId}`,
    });

    expect(status).toEqual(200);
    expect(data).toEqual({ id: customerId });
  });
});
