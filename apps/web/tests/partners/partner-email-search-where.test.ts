import { buildPartnerEmailSearchWhere } from "@/lib/api/partners/program-enrollment-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  sanitizeFullTextSearch: (value: string) => value,
}));

describe("buildPartnerEmailSearchWhere", () => {
  // The candidate path decides the exact routes on the trimmed value, so this
  // builder must judge the same value: a pasted " pn_… " is routed to the
  // database as an exact ID, and an untrimmed exact match would find nothing.
  it.each([
    [
      "a padded partner ID",
      " pn_dlszeepb38rvcnrfbd0srkzb ",
      { id: "pn_dlszeepb38rvcnrfbd0srkzb" },
    ],
    ["a padded email", " steven@dub.co ", { email: "steven@dub.co" }],
  ])("trims %s before the exact match", (_label, search, expected) => {
    expect(buildPartnerEmailSearchWhere({ search })).toEqual(expected);
  });

  it("full-text searches the trimmed free text", () => {
    expect(buildPartnerEmailSearchWhere({ search: " steven " })).toEqual({
      OR: [
        { email: { search: "steven" } },
        { name: { search: "steven" } },
        { companyName: { search: "steven" } },
      ],
    });
  });

  it("treats a blank search as absent", () => {
    expect(buildPartnerEmailSearchWhere({ search: "   " })).toEqual({});
  });
});
