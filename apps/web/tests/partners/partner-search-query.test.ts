import {
  buildPartnerSearchCandidateQuery,
  buildPartnerSearchQuery,
} from "@/lib/api/partners/search";
import { describe, expect, it } from "vitest";

const defaultInput = {
  programId: "prog_test",
  search: "  examp  ",
  page: 3,
  pageSize: 25,
  sortBy: "totalSaleAmount" as const,
  sortOrder: "desc" as const,
};

describe("buildPartnerSearchQuery", () => {
  it("builds a provider-neutral relevance candidate request", () => {
    expect(
      buildPartnerSearchCandidateQuery({
        ...defaultInput,
        status: "approved",
        country: ["CA"],
      }),
    ).toEqual({
      programId: "prog_test",
      query: "examp",
      limit: 100,
    });
  });

  it("maps API pagination, filters, ranges, and sorting", () => {
    expect(
      buildPartnerSearchQuery({
        ...defaultInput,
        status: "approved",
        partnerIds: ["pn_1", "pn_2"],
        groupId: ["grp_1"],
        groupIdOperator: "NOT IN",
        country: ["CA", "US"],
        partnerTagId: ["ptag_1"],
        referredByPartnerId: "pn_referrer",
        totalClicksMin: 10,
        totalClicksMax: 100,
        totalSaleAmountMin: 5_000,
      }),
    ).toEqual({
      programId: "prog_test",
      query: "examp",
      page: 3,
      pageSize: 25,
      filters: {
        status: "approved",
        partnerIds: ["pn_1", "pn_2"],
        groupIds: { values: ["grp_1"], operator: "NOT_IN" },
        countries: { values: ["CA", "US"], operator: "IN" },
        partnerTagIds: { values: ["ptag_1"], operator: "IN" },
        referredByPartnerId: "pn_referrer",
        metrics: {
          totalClicks: { min: 10, max: 100 },
          totalSaleAmount: { min: 5_000 },
        },
      },
      sort: { field: "totalSaleAmount", order: "desc" },
    });
  });

  it("uses provider relevance order when requested", () => {
    expect(
      buildPartnerSearchQuery({
        ...defaultInput,
        sortBy: "relevance",
      }),
    ).toEqual(
      expect.objectContaining({
        programId: "prog_test",
        query: "examp",
        page: 3,
        pageSize: 25,
      }),
    );
    expect(
      buildPartnerSearchQuery({
        ...defaultInput,
        sortBy: "relevance",
      }),
    ).not.toHaveProperty("sort");
  });

  it.each([
    ["missing search", { ...defaultInput, search: undefined }],
    ["empty search", { ...defaultInput, search: "   " }],
    ["exact email", { ...defaultInput, email: "partner@example.com" }],
    ["tenant ID", { ...defaultInput, tenantId: "tenant_test" }],
  ])("keeps %s on the database path", (_name, input) => {
    expect(buildPartnerSearchQuery(input)).toBeNull();
    expect(buildPartnerSearchCandidateQuery(input)).toBeNull();
  });
});
