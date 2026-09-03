import type { Customer } from "@/lib/types";
import { CustomerEnrichedSchema } from "@/lib/zod/schemas/customers";
import { expect } from "@playwright/test";
import { randomCustomer } from "../../utils";
import { test, type ApiClient } from "../fixtures";

const expectedCustomerShape = {
  id: expect.any(String),
  name: expect.any(String),
  email: expect.any(String),
  avatar: null,
  externalId: expect.any(String),
  stripeCustomerId: null,
  country: "US",
  saleAmount: 0,
  sales: 0,
  createdAt: expect.any(String),
  firstSaleAt: null,
  subscriptionCanceledAt: null,
};

async function createCustomer(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  const body = {
    ...randomCustomer(),
    ...overrides,
  };

  return api.post<Customer>("/api/customers", body);
}

async function deleteCustomer(api: ApiClient, id: string | undefined) {
  if (!id) return;
  await api.delete(`/api/customers/${id}`);
}

test("POST /customers", async ({ api }) => {
  let customerId: string | undefined;
  const body = randomCustomer();

  try {
    const { status, data } = await api.post<Customer>("/api/customers", body);
    customerId = data.id;

    expect(status).toEqual(201);
    expect(data).toStrictEqual({
      ...expectedCustomerShape,
      ...body,
      avatar: null,
    });
  } finally {
    await deleteCustomer(api, customerId);
  }
});

test("GET /customers/{id}", async ({ api }) => {
  let customerId: string | undefined;

  try {
    const { data: created } = await createCustomer(api);
    customerId = created.id;

    const { status, data } = await api.get<Customer>(
      `/api/customers/${customerId}`,
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual(created);
  } finally {
    await deleteCustomer(api, customerId);
  }
});

test("GET /customers – by email", async ({ api }) => {
  let customerId: string | undefined;

  try {
    const { data: created } = await createCustomer(api);
    customerId = created.id;

    const { status, data: customers } = await api.get<Customer[]>(
      `/api/customers?email=${encodeURIComponent(created.email!)}`,
    );

    expect(status).toEqual(200);
    expect(customers.length).toBeGreaterThanOrEqual(1);
    expect(customers[0]).toStrictEqual(created);
  } finally {
    await deleteCustomer(api, customerId);
  }
});

test("PATCH /customers/{id}", async ({ api }) => {
  let customerId: string | undefined;

  try {
    const { data: created } = await createCustomer(api);
    customerId = created.id;

    const toUpdate = {
      name: "Updated",
      avatar: "https://api.dub.co/og/avatar/1234567890",
      country: "BR",
    };

    const { status, data } = await api.patch<Customer>(
      `/api/customers/${customerId}`,
      toUpdate,
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      ...created,
      ...toUpdate,
    });
  } finally {
    await deleteCustomer(api, customerId);
  }
});

test("GET /customers – by externalId with includeExpandedFields", async ({
  api,
}) => {
  let customerId: string | undefined;

  try {
    const { data: created } = await createCustomer(api);
    customerId = created.id;

    const { status, data: customers } = await api.get<Customer[]>(
      `/api/customers?externalId=${encodeURIComponent(created.externalId)}&includeExpandedFields=true`,
    );

    expect(status).toEqual(200);
    expect(customers.length).toBeGreaterThanOrEqual(1);
    expect(
      CustomerEnrichedSchema.parse({
        ...customers[0],
        createdAt: new Date(customers[0].createdAt),
      }),
    ).toBeTruthy();
  } finally {
    await deleteCustomer(api, customerId);
  }
});

test("DELETE /customers/{id}", async ({ api }) => {
  const { data: created } = await createCustomer(api);

  const { status, data } = await api.delete<{ id: string }>(
    `/api/customers/${created.id}`,
  );

  expect(status).toEqual(200);
  expect(data).toStrictEqual({
    id: created.id,
  });

  const { status: getStatus } = await api.get(`/api/customers/${created.id}`);
  expect(getStatus).toEqual(404);
});
