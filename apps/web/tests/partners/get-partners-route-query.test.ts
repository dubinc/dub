import { getPartnersRouteQuerySchema } from "@/lib/zod/schemas/partners";
import { describe, expect, it } from "vitest";

const accepts = (params: Record<string, unknown>) =>
  getPartnersRouteQuerySchema.safeParse(params).success;

describe("getPartnersRouteQuerySchema", () => {
  it("accepts the shapes the partners table sends", () => {
    expect(accepts({ sortBy: "relevance", search: "examp" })).toBe(true);
    expect(
      accepts({ sortBy: "relevance", search: "examp", sortOrder: "desc" }),
    ).toBe(true);
    expect(accepts({ search: "examp" })).toBe(true);
    expect(accepts({ sortBy: "totalClicks", sortOrder: "asc" })).toBe(true);
    expect(accepts({ email: "partner@example.com" })).toBe(true);
    expect(accepts({ tenantId: "tenant_1" })).toBe(true);
  });

  it("still accepts the legacy sort aliases", () => {
    for (const sortBy of [
      "clicks",
      "leads",
      "conversions",
      "sales",
      "saleAmount",
      "totalSales",
    ]) {
      expect(accepts({ sortBy })).toBe(true);
    }
  });

  it("rejects relevance without a query the provider can rank", () => {
    expect(accepts({ sortBy: "relevance" })).toBe(false);
    expect(accepts({ sortBy: "relevance", search: "" })).toBe(false);
    expect(accepts({ sortBy: "relevance", search: "   " })).toBe(false);
  });

  it("rejects relevance alongside an exact email lookup", () => {
    expect(
      accepts({ sortBy: "relevance", search: "examp", email: "a@b.co" }),
    ).toBe(false);
  });

  it("rejects relevance alongside a tenant filter", () => {
    expect(
      accepts({ sortBy: "relevance", search: "examp", tenantId: "t_1" }),
    ).toBe(false);
  });

  it("rejects ascending relevance", () => {
    expect(
      accepts({ sortBy: "relevance", search: "examp", sortOrder: "asc" }),
    ).toBe(false);
  });

  it("explains why the request was rejected", () => {
    const result = getPartnersRouteQuerySchema.safeParse({
      sortBy: "relevance",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(
      "sortBy=relevance requires a non-empty search",
    );
  });
});
