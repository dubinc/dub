import {
  createMockPartnerSearchProvider,
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
  status: "approved",
  groupId: null,
  country: "CA",
  createdAt: "2026-08-08T00:00:00.000Z",
  updatedAt: "2026-08-08T00:00:00.000Z",
};

describe("partner search provider contract", () => {
  it.each([
    ["name", "rafi"],
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

    const result = await provider.search({
      programId: partnerDocument.programId,
      query,
      limit: 10,
      offset: 0,
    });

    expect(result.total).toBe(1);
    expect(result.hits[0]?.partnerId).toBe(partnerDocument.partnerId);
  });

  it("keeps search results scoped to a program", async () => {
    const provider = createMockPartnerSearchProvider([partnerDocument]);

    const result = await provider.search({
      programId: "prog_other",
      query: "rafi",
      limit: 10,
      offset: 0,
    });

    expect(result).toEqual({ hits: [], total: 0 });
  });
});
