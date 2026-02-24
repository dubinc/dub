import { PayoutResponse } from "@/lib/types";
import { PayoutResponseSchema } from "@/lib/zod/schemas/payouts";
import { describe, expect, test } from "vitest";
import * as z from "zod/v4";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER } from "../utils/resource";

// Extend date fields to accept strings (API returns JSON strings)
const PayoutResponseTestSchema = PayoutResponseSchema.extend({
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  createdAt: z.string(),
  initiatedAt: z.string().nullable(),
  paidAt: z.string().nullable(),
  partner: PayoutResponseSchema.shape.partner.extend({
    payoutsEnabledAt: z.string().nullable(),
  }),
});

describe("GET /payouts", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("returns list of payouts with valid schema", async () => {
    const { data, status } = await http.get<PayoutResponse[]>({
      path: "/payouts",
      query: {
        limit: "5",
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(z.array(PayoutResponseTestSchema).safeParse(data).success).toBe(
      true,
    );
  });

  test("filters by status", async () => {
    const { data, status } = await http.get<PayoutResponse[]>({
      path: "/payouts",
      query: {
        status: "processed",
        limit: "5",
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((payout) => payout.status === "processed")).toBe(true);
  });

  test("filters by partnerId", async () => {
    const { data, status } = await http.get<PayoutResponse[]>({
      path: "/payouts",
      query: {
        partnerId: E2E_PARTNER.id,
        limit: "5",
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((payout) => payout.partner.id === E2E_PARTNER.id)).toBe(
      true,
    );
  });

  test("filters by tenantId", async () => {
    const { data, status } = await http.get<PayoutResponse[]>({
      path: "/payouts",
      query: {
        tenantId: E2E_PARTNER.tenantId,
        limit: "5",
      },
    });

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(
      data.some((payout) => payout.partner.tenantId === E2E_PARTNER.tenantId),
    ).toBe(true);
  });

  test("returns 404 for non-existent tenantId", async () => {
    const { status, data } = await http.get<any>({
      path: "/payouts",
      query: {
        tenantId: "nonexistent-tenant-id",
      },
    });

    expect(status).toEqual(404);
    expect(data.error.code).toBe("not_found");
  });
});
