import { CommissionResponse } from "@/lib/types";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe.sequential("/commissions/bulk - bulk updates", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  const getCommissionsByStatus = async (status: string) => {
    const { status: responseStatus, data } = await http.get<
      CommissionResponse[]
    >({
      path: "/commissions",
      query: {
        status,
        pageSize: "100",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    });

    expect(responseStatus).toEqual(200);
    return data;
  };

  test("PATCH /commissions/bulk - validation error for duplicate commission IDs", async () => {
    const pendingCommissions = await getCommissionsByStatus("pending");
    expect(pendingCommissions.length).toBeGreaterThan(0);

    const duplicateId = pendingCommissions[0].id;

    const { status, data } = await http.patch<any>({
      path: "/commissions/bulk",
      body: {
        commissionIds: [duplicateId, duplicateId],
        status: "canceled",
      },
    });

    expect(status).toEqual(422);
    expect(data.error.message).toContain("commissionIds must be unique");
  });

  test("PATCH /commissions/bulk - returns not_found for invalid commission IDs", async () => {
    const { status, data } = await http.patch<any>({
      path: "/commissions/bulk",
      body: {
        commissionIds: ["cm_invalid_commission_id_12345"],
        status: "canceled",
      },
    });

    expect(status).toEqual(404);
    expect(data.error.message).toContain(
      "One or more commissions were not found",
    );
  });

  test("PATCH /commissions/bulk - returns bad_request for paid commissions", async () => {
    const paidCommissions = await getCommissionsByStatus("paid");
    expect(paidCommissions.length).toBeGreaterThan(0);

    const { status, data } = await http.patch<any>({
      path: "/commissions/bulk",
      body: {
        commissionIds: [paidCommissions[0].id],
        status: "canceled",
      },
    });

    expect(status).toEqual(400);
    expect(data.error.message).toContain("have already been paid");
  });

  test("PATCH /commissions/bulk - returns bad_request when already in target status", async () => {
    const pendingCommissions = await getCommissionsByStatus("pending");
    expect(pendingCommissions.length).toBeGreaterThan(0);

    const { status, data } = await http.patch<any>({
      path: "/commissions/bulk",
      body: {
        commissionIds: [pendingCommissions[0].id],
        status: "pending",
      },
    });

    expect(status).toEqual(400);
    expect(data.error.message).toContain("already in the pending status");
  });

  test("PATCH /commissions/bulk - updates multiple commissions", async () => {
    const pendingCommissions = await getCommissionsByStatus("pending");
    expect(pendingCommissions.length).toBeGreaterThanOrEqual(2);

    const commissionIds = pendingCommissions.slice(0, 2).map((c) => c.id);

    const { status, data } = await http.patch<
      Array<{ id: string; status: string }>
    >({
      path: "/commissions/bulk",
      body: {
        commissionIds,
        status: "duplicate",
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data.map((c) => c.id).sort()).toEqual([...commissionIds].sort());
    expect(data.every((c) => c.status === "duplicate")).toBe(true);
  });
});
