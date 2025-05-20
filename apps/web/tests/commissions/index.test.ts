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
  let testPaidCommissionId: string;

  test("GET /commissions", async () => {
    const { status, data: commissions } = await http.get<Commission[]>({
      path: "/commissions",
      query: {
        page: "1",
        pageSize: "10",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(commissions)).toBe(true);
    expect(commissions.length).toBeGreaterThan(0);
    expect(commissions[0]).toMatchObject(expectedCommission);

    // Store the first commission's ID for subsequent tests
    testCommissionId = commissions[0].id;
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
      amount: 10000, // 100 MYR
      currency: "myr",
    };

    const { status, data: commission } = await http.patch<Commission>({
      path: `/commissions/${testCommissionId}`,
      body: toUpdate,
    });

    console.log("commission", commission);

    expect(status).toEqual(200);
    expect(commission.amount).toBeLessThan(6000);
    expect(commission.amount).toBeGreaterThanOrEqual(3000); // 100 MYR should be around 23 USD and hence 6000 - 2300 = 3700
    expect(commission.currency).toEqual("usd");
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
    // The error response will be in the response body
    const errorResponse = response.data as unknown as { message: string };
    expect(errorResponse.message).toContain("has already been paid");
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
