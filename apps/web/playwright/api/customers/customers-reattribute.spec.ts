import { prisma } from "@/lib/prisma";
import type { Customer, CustomerEnriched } from "@/lib/types";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { apiError, randomCustomer } from "../../utils";
import { test, type ApiClient } from "../fixtures";
import { createPartner, deletePartner } from "../partners/helpers";

async function createCustomer(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  return api.post<Customer>("/api/customers", {
    ...randomCustomer(),
    ...overrides,
  });
}

async function deleteCustomer(api: ApiClient, id: string | undefined) {
  if (!id) return;
  await api.delete(`/api/customers/${id}`);
}

test("POST /customers/{id}/reattribute – fast path", async ({ api }) => {
  let customerId: string | undefined;
  let partnerId: string | undefined;

  try {
    const { status: partnerStatus, data: partner } = await createPartner(api);
    partnerId = partner.id;

    expect(partnerStatus).toEqual(201);
    expect(partner.links).not.toBeNull();
    expect(partner.links!.length).toBeGreaterThan(0);

    const targetLink = partner.links![0];
    const { data: created } = await createCustomer(api);
    customerId = created.id;

    const { status, data } = await api.post<CustomerEnriched>(
      `/api/customers/${created.id}/reattribute`,
      {
        partnerId: partner.id,
        linkId: targetLink.id,
      },
    );

    expect(status).toEqual(200);
    expect(data.id).toEqual(created.id);
    expect(data.partner?.id).toEqual(partner.id);
    expect(data.link?.id).toEqual(targetLink.id);
  } finally {
    await deleteCustomer(api, customerId);
    await deletePartner(partnerId);
  }
});

test("POST /customers/{id}/reattribute – unknown customer", async ({ api }) => {
  expect(
    await api.post("/api/customers/cus_doesnotexist/reattribute", {
      partnerId: "pn_doesnotexist",
      linkId: "link_doesnotexist",
    }),
  ).toEqual(
    apiError({
      code: "not_found",
      message:
        "Customer not found. Make sure you're using the correct customer ID (e.g. `cus_3TagGjzRzmsFJdH8od2BNCsc`) or external ID (has to be prefixed with `ext_`).",
    }),
  );
});

test("POST /customers/{id}/reattribute – unchanged partner and link", async ({
  api,
}) => {
  let customerId: string | undefined;
  let partnerId: string | undefined;

  try {
    const { status: partnerStatus, data: partner } = await createPartner(api);
    partnerId = partner.id;

    expect(partnerStatus).toEqual(201);
    expect(partner.links).not.toBeNull();
    expect(partner.links!.length).toBeGreaterThan(0);

    const targetLink = partner.links![0];
    const { data: created } = await createCustomer(api);
    customerId = created.id;

    const { status: firstStatus } = await api.post<CustomerEnriched>(
      `/api/customers/${created.id}/reattribute`,
      {
        partnerId: partner.id,
        linkId: targetLink.id,
      },
    );
    expect(firstStatus).toEqual(200);

    expect(
      await api.post(`/api/customers/${created.id}/reattribute`, {
        partnerId: partner.id,
        linkId: targetLink.id,
      }),
    ).toEqual(
      apiError({
        code: "bad_request",
        message: "Customer is already attributed to this partner and link.",
      }),
    );
  } finally {
    await deleteCustomer(api, customerId);
    await deletePartner(partnerId);
  }
});

test("POST /customers/{id}/reattribute – retired stub", async ({ api }) => {
  let customerId: string | undefined;
  let partnerId: string | undefined;

  try {
    const { status: partnerStatus, data: partner } = await createPartner(api);
    partnerId = partner.id;

    expect(partnerStatus).toEqual(201);
    expect(partner.links).not.toBeNull();
    expect(partner.links!.length).toBeGreaterThan(0);

    const { data: created } = await createCustomer(api);
    customerId = created.id;

    await prisma.customer.update({
      where: { id: created.id },
      data: {
        externalId: `dummy_${nanoid(32)}`,
        partnerId: null,
        linkId: null,
        programId: null,
      },
    });

    expect(
      await api.post(`/api/customers/${created.id}/reattribute`, {
        partnerId: partner.id,
        linkId: partner.links![0].id,
      }),
    ).toEqual(
      apiError({
        code: "bad_request",
        message:
          "This customer was already reattributed. Use the new customer ID.",
      }),
    );
  } finally {
    await deleteCustomer(api, customerId);
    await deletePartner(partnerId);
  }
});

test("POST /customers/{id}/reattribute – banned partner", async ({ api }) => {
  let customerId: string | undefined;
  let partnerId: string | undefined;

  try {
    const { status: partnerStatus, data: partner } = await createPartner(api);
    partnerId = partner.id;

    expect(partnerStatus).toEqual(201);
    expect(partner.links).not.toBeNull();
    expect(partner.links!.length).toBeGreaterThan(0);

    const { status: banStatus } = await api.post("/api/partners/ban", {
      partnerId: partner.id,
      reason: "fraud",
    });
    expect(banStatus).toEqual(200);

    const { data: created } = await createCustomer(api);
    customerId = created.id;

    expect(
      await api.post(`/api/customers/${created.id}/reattribute`, {
        partnerId: partner.id,
        linkId: partner.links![0].id,
      }),
    ).toEqual(
      apiError({
        code: "unprocessable_entity",
        message: "This partner is not eligible to receive customers.",
      }),
    );
  } finally {
    await deleteCustomer(api, customerId);
    await deletePartner(partnerId);
  }
});
