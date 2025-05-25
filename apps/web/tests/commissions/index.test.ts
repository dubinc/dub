import { CommissionResponseSchema } from "@/lib/zod/schemas/commissions";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { IntegrationHarness } from "../utils/integration";

type Commission = z.infer<typeof CommissionResponseSchema>;

const expectedCommission = {
  id: expect.any(String),
  amount: expect.any(Number),
  earnings: expect.any(Number),
  status: expect.any(String),
  currency: expect.any(String),
  type: expect.any(String),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
};

describe.sequential("/commissions/**", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let testCommissionId: string;
  let testLeadCommissionId: string;
  let testPaidCommissionId: string;

  test("GET /commissions", async () => {
    const { status, data: commissions } = await http.get<Commission[]>({
      path: "/commissions",
      query: {
        status: "processed",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(commissions)).toBe(true);
    expect(commissions.length).toBeGreaterThan(0);
    expect(commissions[0]).toMatchObject(expectedCommission);
    // Store the first sale and lead commission's ID for subsequent tests
    testCommissionId = commissions.find((c) => c.type === "sale")!.id;
    testLeadCommissionId = commissions.find((c) => c.type === "lead")!.id;
  });

  test("GET /commissions with filters", async () => {
    // Get paid commissions
    const { status: paidStatus, data: paidCommissions } = await http.get<
      Commission[]
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
    expect(paidCommissions[0]).toMatchObject(expectedCommission);
    testPaidCommissionId = paidCommissions[0].id;
  });

  test("PATCH /commissions/{id} - update amount", async () => {
    const toUpdate = {
      amount: 5000, // $50.00 in cents
    };

    const { status, data: commission } = await http.patch<Commission>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(commission).toMatchObject({
      ...expectedCommission,
      amount: toUpdate.amount,
    });
  });

  test("PATCH /commissions/{id} - modify amount", async () => {
    const toUpdate = {
      modifyAmount: 1000, // Add $10.00 to existing amount
      currency: "usd",
    };

    const { status, data: commission } = await http.patch<Commission>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(commission.amount).toEqual(6000);
  });

  test("PATCH /commissions/{id} - foreign currency conversion", async () => {
    const toUpdate = {
      amount: 1437, // approximately 1000 USD cents
      currency: "jpy",
    };

    const { status, data: commission } = await http.patch<Commission>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(commission.currency).toEqual("usd");
    expect(commission.amount).toBeGreaterThanOrEqual(900); // 900 cents
    expect(commission.amount).toBeLessThanOrEqual(1100); // 1100 cents
  });

  test("PATCH /commissions/{id} - error on lead commission", async () => {
    const toUpdate = {
      amount: 5000,
    };

    const response = await http.patch<Commission>({
      path: `/commissions/${testLeadCommissionId}`,
      body: toUpdate,
    });

    expect(response.status).toEqual(400);
    expect(response.data["error"].message).toContain("not a sale commission.");
  });

  test("PATCH /commissions/{id} - error on paid commission", async () => {
    const toUpdate = {
      amount: 5000,
    };

    const response = await http.patch<Commission>({
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

    const { status, data: commission } = await http.patch<Commission>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    expect(status).toEqual(200);
    expect(commission).toMatchObject({
      ...expectedCommission,
      status: toUpdate.status,
    });
  });
});
