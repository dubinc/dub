import { CommissionResponse } from "@/lib/types";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const expectedCommission = {
  id: expect.any(String),
  amount: expect.any(Number),
  earnings: expect.any(Number),
  status: expect.any(String),
  currency: expect.any(String),
  type: expect.any(String),
  quantity: expect.any(Number),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  partner: expect.any(Object),
  customer: expect.any(Object),
};

function expectCommissionResponse(
  commission: CommissionResponse,
  overrides: Record<string, unknown> = {},
) {
  expect(commission).toMatchObject({
    ...expectedCommission,
    ...overrides,
  });
  // metadata is nullable but must be present on workspace commission responses
  expect(commission).toHaveProperty("metadata");
  expect(
    commission.metadata === null ||
      (typeof commission.metadata === "object" &&
        !Array.isArray(commission.metadata)),
  ).toBe(true);
}

describe.sequential("/commissions/**", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let testCommissionId: string;
  let testLeadCommissionId: string;
  let testPaidCommissionId: string;

  test("GET /commissions", async () => {
    const { status: saleCommissionStatus, data: saleCommissions } =
      await http.get<CommissionResponse[]>({
        path: "/commissions",
        query: {
          status: "processed",
          type: "sale",
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });

    expect(saleCommissionStatus).toEqual(200);
    expect(Array.isArray(saleCommissions)).toBe(true);
    expect(saleCommissions.length).toBeGreaterThan(0);
    expectCommissionResponse(saleCommissions[0]);

    const { status: leadStatus, data: leadCommissions } = await http.get<
      CommissionResponse[]
    >({
      path: "/commissions",
      query: {
        status: "processed",
        type: "lead",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    });
    expect(leadStatus).toEqual(200);
    expect(Array.isArray(leadCommissions)).toBe(true);
    expect(leadCommissions.length).toBeGreaterThan(0);
    expectCommissionResponse(leadCommissions[0]);

    // Store the first sale and lead commission's ID for subsequent tests
    testCommissionId = saleCommissions[0].id;
    testLeadCommissionId = leadCommissions[0].id;
  });

  test("GET /commissions with filters", async () => {
    // Get paid commissions
    const { status: paidStatus, data: paidCommissions } = await http.get<
      CommissionResponse[]
    >({
      path: "/commissions",
      query: {
        status: "paid",
        page: "1",
        pageSize: "1",
      },
    });

    expect(paidStatus).toEqual(200);
    expect(Array.isArray(paidCommissions)).toBe(true);
    expect(paidCommissions.length).toBeGreaterThan(0);
    expectCommissionResponse(paidCommissions[0]);
    testPaidCommissionId = paidCommissions[0].id;
  });

  test("PATCH /commissions/{id} - update earnings", async () => {
    const toUpdate = {
      earnings: 3000, // $30.00 in cents
    };

    const { status, data: commission } = await http.patch<CommissionResponse>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expectCommissionResponse(commission, { earnings: toUpdate.earnings });
  });

  test("PATCH /commissions/{id} - update saleAmount", async () => {
    const toUpdate = {
      saleAmount: 5000, // $50.00 in cents
    };

    const { status, data: commission } = await http.patch<CommissionResponse>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expectCommissionResponse(commission, { amount: toUpdate.saleAmount });
  });

  test("PATCH /commissions/{id} - modifySaleAmount", async () => {
    const toUpdate = {
      modifySaleAmount: 1000, // Add $10.00 to existing amount
      currency: "usd",
    };

    const { status, data: commission } = await http.patch<CommissionResponse>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(commission.amount).toEqual(6000);
    expectCommissionResponse(commission, { amount: 6000 });
  });

  test("PATCH /commissions/{id} - update amount (backward compatibility)", async () => {
    const toUpdate = {
      amount: 4000, // $40.00 in cents
    };

    const { status, data: commission } = await http.patch<CommissionResponse>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expectCommissionResponse(commission, { amount: toUpdate.amount });
  });

  test("PATCH /commissions/{id} - foreign currency conversion", async () => {
    const toUpdate = {
      saleAmount: 1580, // approximately 1000 USD cents
      currency: "jpy",
    };

    const { status, data: commission } = await http.patch<CommissionResponse>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(commission.currency).toEqual("usd");
    expect(commission.amount).toBeGreaterThanOrEqual(900); // 900 cents
    expect(commission.amount).toBeLessThanOrEqual(1100); // 1100 cents
    expectCommissionResponse(commission);
  });

  test("PATCH /commissions/{id} - error on lead commission", async () => {
    const toUpdate = {
      saleAmount: 5000,
    };

    const response = await http.patch<CommissionResponse>({
      path: `/commissions/${testLeadCommissionId}`,
      body: toUpdate,
    });

    expect(response.status).toEqual(400);
    expect(response.data["error"].message).toContain("not a sale commission.");
  });

  test("PATCH /commissions/{id} - error on paid commission", async () => {
    const toUpdate = {
      saleAmount: 5000,
    };

    const response = await http.patch<CommissionResponse>({
      path: `/commissions/${testPaidCommissionId}`,
      body: toUpdate,
    });

    expect(response.status).toEqual(400);
    expect(response.data["error"].message).toContain("has already been paid");
  });

  test("PATCH /commissions/{id} - update status to refunded", async () => {
    const toUpdate = {
      status: "refunded",
    };

    const { status, data: commission } = await http.patch<CommissionResponse>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expectCommissionResponse(commission, { status: toUpdate.status });
  });
});
