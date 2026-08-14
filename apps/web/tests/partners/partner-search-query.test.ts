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

  describe("pasted partner IDs", () => {
    it.each([
      ["24-char suffix, the production minimum", "pn_dlszeepb38rvcnrfbd0srkzb"],
      ["25-char suffix, the common case", "pn_1K0NM7HCN944PEMZ3CQPH43H8"],
    ])(
      "keeps %s on the database, which has it as a primary key",
      (_label, search) => {
        expect(
          buildPartnerSearchCandidateQuery({ programId: "prog_1", search }),
        ).toBeNull();
      },
    );

    it.each([
      ["a bare prefix", "pn_"],
      ["a partial ID", "pn_dls"],
      ["one character short of the minimum", "pn_dlszeepb38rvcnrfbd0srkz"],
      ["an ID with a space", "pn_dlszeepb38rvcnrfbd0srkzb other"],
    ])("sends %s to the provider", (_label, search) => {
      expect(
        buildPartnerSearchCandidateQuery({ programId: "prog_1", search }),
      ).toMatchObject({ query: search });
    });
  });
});
