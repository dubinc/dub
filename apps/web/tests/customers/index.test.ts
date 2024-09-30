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
  const { workspace, http } = await h.init();

  afterAll(async () => {
    await h.deleteCustomer(customerRecord.externalId);
  });

  test("POST /customers", async () => {
    const { status, data: customer } = await http.post<Customer>({
      path: "/customers",
      query: { workspaceId: workspace.id },
      body: customerRecord,
    });

    expect(status).toEqual(201);
    expect(customer).toStrictEqual(expectedCustomer);
  });

  test("GET /customers/{externalId}", async () => {
    const { status, data: customer } = await http.get<Customer>({
      path: `/customers/${customerRecord.externalId}`,
      query: { workspaceId: workspace.id },
    });

    expect(status).toEqual(200);
    expect(customer).toStrictEqual(expectedCustomer);
  });

  test("GET /customers", async () => {
    const { status, data: customers } = await http.get<Customer[]>({
      path: "/customers",
      query: { workspaceId: workspace.id },
    });

    expect(status).toEqual(200);
    expect(customers).toContainEqual(expectedCustomer);
  });

  test("PATCH /customers/{externalId}", async () => {
    const toUpdate = {
      email: `${externalId}@example.co`,
    };

    const { status, data: customer } = await http.patch<Customer>({
      path: `/customers/${customerRecord.externalId}`,
      query: { workspaceId: workspace.id },
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(customer).toStrictEqual({
      ...expectedCustomer,
      ...toUpdate,
    });
  });

  test("DELETE /customers/{externalId}", async () => {
    const { status, data } = await http.delete({
      path: `/customers/${customerRecord.externalId}`,
      query: { workspaceId: workspace.id },
    });

    expect(status).toEqual(200);
    expect(data).toEqual({ externalId: customerRecord.externalId });
  });
});
