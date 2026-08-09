import {
  createMockPartnerSearchProvider,
  PARTNER_SEARCH_CANDIDATE_LIMIT,
  PartnerSearchDocument,
} from "@/lib/api/partners/search";
import { describe, expect, it } from "vitest";

const partnerDocument: PartnerSearchDocument = {
  id: "pge_test",
  programId: "prog_test",
  partnerId: "pn_test",
  name: "Rafi Hasan",
  email: "partner@example.com",
  companyName: "Dub Partners",
  description: "Developer tools educator",
  platformTypes: ["website", "youtube", "twitter"],
  platformIdentifiers: ["rafi.dev", "@rafi-youtube", "@rafi-on-x"],
  linkDomains: ["dub.sh"],
  linkKeys: ["rafi"],
  shortLinks: ["https://dub.sh/rafi"],
  destinationUrls: ["https://example.com/referrals/rafi"],
};

describe("partner search provider contract", () => {
  it.each([
    ["name", "rafi"],
    ["partner ID", "pn_test"],
    ["partial email", "examp"],
    ["company name", "dub partners"],
    ["description", "educator"],
    ["platform type", "twitter"],
    ["platform identifier", "rafi-on-x"],
    ["link domain", "dub.sh"],
    ["link key", "rafi"],
    ["short link", "dub.sh/rafi"],
    ["link destination", "referrals/rafi"],
  ])("searches by %s", async (_field, query) => {
    const provider = createMockPartnerSearchProvider([partnerDocument]);

    const result = await provider.searchCandidates({
      programId: partnerDocument.programId,
      query,
      limit: PARTNER_SEARCH_CANDIDATE_LIMIT,
    });
    expect(result.hits).toEqual([{ id: partnerDocument.id }]);
  });

  it("keeps search results scoped to a program", async () => {
    const provider = createMockPartnerSearchProvider([partnerDocument]);

    await expect(
      provider.searchCandidates({
        programId: "prog_other",
        query: "rafi",
        limit: PARTNER_SEARCH_CANDIDATE_LIMIT,
      }),
    ).resolves.toEqual({ hits: [] });
  });

  it("bounds relevance candidates to the shared provider limit", async () => {
    const documents = Array.from(
      { length: PARTNER_SEARCH_CANDIDATE_LIMIT + 1 },
      (_, index) => ({
        ...partnerDocument,
        id: `pge_${index}`,
        partnerId: `pn_${index}`,
      }),
    );
    const provider = createMockPartnerSearchProvider(documents);

    const result = await provider.searchCandidates({
      programId: partnerDocument.programId,
      query: "rafi",
      limit: PARTNER_SEARCH_CANDIDATE_LIMIT,
    });
    expect(result.hits).toHaveLength(PARTNER_SEARCH_CANDIDATE_LIMIT);
    expect(result.hits[0]).toEqual(expect.objectContaining({ id: "pge_0" }));
    await expect(
      provider.searchCandidates({
        programId: partnerDocument.programId,
        query: "rafi",
        limit: PARTNER_SEARCH_CANDIDATE_LIMIT + 1,
      }),
    ).rejects.toThrow("must be between 1 and 100");
  });
});
