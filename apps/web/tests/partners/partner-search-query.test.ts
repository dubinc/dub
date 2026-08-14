import { buildPartnerSearchCandidateQuery } from "@/lib/api/partners/search";
import { describe, expect, it } from "vitest";

const defaultInput = {
  programId: "prog_test",
  search: "  examp  ",
  page: 3,
  pageSize: 25,
  sortBy: "totalSaleAmount" as const,
  sortOrder: "desc" as const,
};

describe("buildPartnerSearchCandidateQuery", () => {
  it("builds a provider-neutral relevance candidate request", () => {
    expect(buildPartnerSearchCandidateQuery(defaultInput)).toEqual({
      programId: "prog_test",
      query: "examp",
      limit: 999,
    });
  });

  it.each([
    ["missing search", { ...defaultInput, search: undefined }],
    ["empty search", { ...defaultInput, search: "   " }],
    ["exact email", { ...defaultInput, email: "partner@example.com" }],
    ["tenant ID", { ...defaultInput, tenantId: "tenant_test" }],
  ])("keeps %s on the database path", (_name, input) => {
    expect(buildPartnerSearchCandidateQuery(input)).toBeNull();
  });

  describe("exact email queries", () => {
    it.each(["steven@dub.co", "alex.sanchez+tag@techcorp.io", "a@b.io"])(
      "keeps %s on the database, which indexes email",
      (search) => {
        expect(
          buildPartnerSearchCandidateQuery({ programId: "prog_1", search }),
        ).toBeNull();
      },
    );

    it.each([
      ["half-typed", "steven@"],
      ["domain only", "@dub.co"],
      ["no dot in the domain", "steven@dub"],
      ["two words", "steven@dub.co other"],
      ["a name", "steven"],
    ])("sends %s to the provider", (_label, search) => {
      expect(
        buildPartnerSearchCandidateQuery({ programId: "prog_1", search }),
      ).toMatchObject({ query: search });
    });
  });
});
