import { CommissionResponse } from "@/lib/types";
import { describe, expect, test } from "vitest";
import { randomCustomer, randomId, retry } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import {
  E2E_LEAD_REWARD,
  E2E_PARTNER,
  E2E_SALE_REWARD,
} from "../utils/resource";
import { verifyCommission } from "../utils/verify-commission";

const expectedQueuedResponse = {
  status: "queued",
  message: "Commission creation has been queued.",
};

const validationCases = [
  {
    name: "missing type field",
    body: {
      partnerId: E2E_PARTNER.id,
      amount: 500,
    },
    expectedStatus: 422,
    expectedMessageContains: "type",
  },
  {
    name: "invalid type value",
    body: {
      type: "invalid",
      partnerId: E2E_PARTNER.id,
    },
    expectedStatus: 422,
    expectedMessageContains: "type",
  },
  {
    name: "custom commission with amount 0",
    body: {
      type: "custom",
      partnerId: E2E_PARTNER.id,
      amount: 0,
    },
    expectedStatus: 422,
    expectedMessageContains: "amount",
  },
  {
    name: "missing partnerId",
    body: {
      type: "custom",
      amount: 500,
    },
    expectedStatus: 422,
    expectedMessageContains: "partnerId",
  },
];

validationCases.forEach(
  ({ name, body, expectedStatus, expectedMessageContains }) => {
    test(`POST /commissions - validation error: ${name}`, async (ctx) => {
      const h = new IntegrationHarness(ctx);
      const { http } = await h.init();

      const response = await http.post<any>({
        path: "/commissions",
        body,
      });

      expect(response.status).toEqual(expectedStatus);
      expect(response.data.error.code).toEqual("unprocessable_entity");
      expect(response.data.error.message.toLowerCase()).toContain(
        expectedMessageContains,
      );
    });
  },
);

describe.sequential("POST /commissions", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("create custom commission with required fields", async () => {
    const { status, data } = await http.post<any>({
      path: "/commissions",
      body: {
        type: "custom",
        partnerId: E2E_PARTNER.id,
        amount: 500,
      },
    });

    expect(status).toEqual(202);
    expect(data).toStrictEqual(expectedQueuedResponse);

    // Custom commissions are created synchronously — verify via GET
    await retry(
      async () => {
        const { data: commissions } = await http.get<CommissionResponse[]>({
          path: "/commissions",
          query: {
            partnerId: E2E_PARTNER.id,
            type: "custom",
            sortBy: "createdAt",
            sortOrder: "desc",
            pageSize: "1",
          },
        });

        expect(commissions.length).toBeGreaterThan(0);
        expect(commissions[0].earnings).toEqual(500);
        expect(commissions[0].amount).toEqual(0);
        expect(commissions[0].type).toEqual("custom");
      },
      {
        retries: 5,
        interval: 1000,
      },
    );
  });

  test("create custom commission with all fields", async () => {
    const { status, data } = await http.post<any>({
      path: "/commissions",
      body: {
        type: "custom",
        partnerId: E2E_PARTNER.id,
        amount: 1000,
        date: "2025-01-15",
        description: "E2E bonus",
      },
    });

    expect(status).toEqual(202);
    expect(data).toStrictEqual(expectedQueuedResponse);

    await retry(
      async () => {
        const { data: commissions } = await http.get<CommissionResponse[]>({
          path: "/commissions",
          query: {
            partnerId: E2E_PARTNER.id,
            type: "custom",
            sortBy: "createdAt",
            sortOrder: "desc",
            pageSize: "5",
          },
        });

        const match = commissions.find(
          (c) => c.earnings === 1000 && c.description === "E2E bonus",
        );

        expect(match).toBeDefined();
        expect(match!.amount).toEqual(0);
        expect(match!.type).toEqual("custom");
      },
      {
        retries: 5,
        interval: 1000,
      },
    );
  });

  test("create lead commission", async () => {
    const customer = randomCustomer();

    const { status, data } = await http.post<any>({
      path: "/commissions",
      body: {
        type: "lead",
        partnerId: E2E_PARTNER.id,
        customer: {
          externalId: customer.externalId,
          email: customer.email,
          name: customer.name,
        },
      },
    });

    expect(status).toEqual(202);
    expect(data).toStrictEqual(expectedQueuedResponse);

    await verifyCommission({
      http,
      customerExternalId: customer.externalId,
      expectedEarnings: E2E_LEAD_REWARD.amountInCents,
    });
  });

  test("create sale commission with manual amount", async () => {
    const invoiceId = `INV_${randomId()}`;

    const { status, data } = await http.post<any>({
      path: "/commissions",
      body: {
        type: "sale",
        partnerId: E2E_PARTNER.id,
        saleAmount: 1000,
        invoiceId,
      },
    });

    expect(status).toEqual(202);
    expect(data).toStrictEqual(expectedQueuedResponse);

    await verifyCommission({
      http,
      invoiceId,
      expectedAmount: 1000,
      expectedEarnings: E2E_SALE_REWARD.amountInCents,
    });
  });

  test("error when customer is not found", async () => {
    const { status, data } = await http.post<any>({
      path: "/commissions",
      body: {
        type: "sale",
        partnerId: E2E_PARTNER.id,
        customerId: "cus_nonexistent",
        saleAmount: 1000,
      },
    });

    expect(status).toEqual(404);
    expect(data.error.code).toEqual("not_found");
    expect(data.error.message).toContain("not found");
  });

  test("error when link does not belong to partner", async () => {
    const { status, data } = await http.post<any>({
      path: "/commissions",
      body: {
        type: "lead",
        partnerId: E2E_PARTNER.id,
        linkId: "link_nonexistent",
      },
    });

    expect(status).toEqual(404);
    expect(data.error.code).toEqual("not_found");
    expect(data.error.message).toContain("does not belong");
  });

  test("error when invoiceId already exists", async () => {
    const { data: existingCommissions } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: {
        type: "sale",
        sortBy: "createdAt",
        sortOrder: "desc",
        pageSize: "50",
      },
    });

    const commissionWithInvoice = existingCommissions.find(
      (c) => c.invoiceId != null,
    );

    expect(commissionWithInvoice).toBeDefined();

    const { status, data } = await http.post<any>({
      path: "/commissions",
      body: {
        type: "sale",
        partnerId: E2E_PARTNER.id,
        saleAmount: 1000,
        invoiceId: commissionWithInvoice!.invoiceId,
      },
    });

    expect(status).toEqual(400);
    expect(data.error.code).toEqual("bad_request");
    expect(data.error.message).toContain("already a commission");
  });
});
