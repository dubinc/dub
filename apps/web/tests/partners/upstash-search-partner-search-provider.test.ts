import {
  createUpstashSearchPartnerSearchProvider,
  resetUpstashSearchPartnerSearchIndex,
  type PartnerSearchDocument,
} from "@/lib/api/partners/search";
import { beforeEach, describe, expect, it, vi } from "vitest";

const document: PartnerSearchDocument = {
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
  tenantId: null,
  groupId: null,
  country: "CA",
  partnerTagIds: ["ptag_test"],
  referredByPartnerId: null,
  totalClicks: 100,
  totalLeads: 20,
  totalConversions: 10,
  totalSaleAmount: 50_000,
  totalCommissions: 10_000,
  netRevenue: 40_000,
  earningsPerClick: 5,
  averageLifetimeValue: 5_000,
  clickToLeadRate: 0.2,
  clickToConversionRate: 0.1,
  leadToConversionRate: 0.5,
  returnOnAdSpend: 5,
  createdAt: "2026-08-08T00:00:00.000Z",
  updatedAt: "2026-08-08T00:00:00.000Z",
};

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  info: vi.fn(),
  reset: vi.fn(),
  search: vi.fn(),
  upsert: vi.fn(),
}));

function createSearchIndexMock() {
  return {
    delete: mocks.delete,
    info: mocks.info,
    reset: mocks.reset,
    search: mocks.search,
    upsert: mocks.upsert,
  };
}

function getSearchResult(
  overrides: {
    id?: string;
    name?: string;
    email?: string;
    score?: number;
  } = {},
) {
  return {
    id: overrides.id ?? document.id,
    content: {
      partnerId: document.partnerId,
      name: overrides.name ?? document.name,
      email: overrides.email ?? document.email!,
      companyName: document.companyName!,
      description: document.description!,
      platforms: document.platformIdentifiers.join(" "),
      links: document.destinationUrls.join(" "),
      emailNgrams: "exa xam amp",
    },
    metadata: {
      programId: document.programId,
    },
    score: overrides.score ?? 0.9,
  };
}

describe("Upstash Search partner search provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.delete.mockResolvedValue({ deleted: 0 });
    mocks.info.mockResolvedValue({
      documentCount: 0,
      pendingDocumentCount: 0,
    });
    mocks.reset.mockResolvedValue("Success");
    mocks.search.mockResolvedValue([]);
    mocks.upsert.mockResolvedValue("Success");
  });

  it("stores every searchable assignment field within the content limit", async () => {
    const provider = createUpstashSearchPartnerSearchProvider({
      searchIndex: createSearchIndexMock(),
      indexName: "test-index",
    });

    await provider.upsert([
      {
        ...document,
        description: "description ".repeat(1_000),
        destinationUrls: [`https://example.com/${"path/".repeat(1_000)}`],
      },
    ]);

    const indexedDocument = mocks.upsert.mock.calls[0]![0][0];
    expect(JSON.stringify(indexedDocument.content).length).toBeLessThan(4_096);
    expect(indexedDocument.content).toEqual(
      expect.objectContaining({
        name: document.name,
        partnerId: document.partnerId,
        email: document.email,
        companyName: document.companyName,
        platforms: expect.stringContaining("rafi-on-x"),
        links: expect.stringContaining("dub.sh"),
        emailNgrams: expect.stringContaining("exa"),
      }),
    );
    expect(indexedDocument.metadata).toEqual({
      programId: document.programId,
    });
  });

  it("adds an exact email n-gram search for partial email matches", async () => {
    const emailResult = getSearchResult();
    mocks.search.mockImplementation(async ({ query }: { query: string }) =>
      query === "exa xam amp" ? [emailResult] : [],
    );
    const provider = createUpstashSearchPartnerSearchProvider({
      searchIndex: createSearchIndexMock(),
      indexName: "test-index",
    });

    await expect(
      provider.search({
        programId: document.programId,
        query: "examp",
        page: 1,
        pageSize: 10,
      }),
    ).resolves.toEqual({
      hits: [
        {
          id: document.id,
          score: emailResult.score,
        },
      ],
    });

    expect(mocks.search).toHaveBeenCalledTimes(2);
    expect(mocks.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "examp",
        inputEnrichment: false,
        reranking: false,
        semanticWeight: 0,
      }),
    );
    expect(mocks.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: "exa xam amp" }),
    );
    expect(mocks.search.mock.calls[0]![0].filter).toContain(
      '@metadata.programId = "prog_test"',
    );
  });

  it("returns relevance results without requiring a complete match set", async () => {
    mocks.search.mockResolvedValue(
      Array.from({ length: 100 }, (_, index) =>
        getSearchResult({
          id: `pge_${index}`,
          score: 1 - index / 100,
        }),
      ),
    );
    const provider = createUpstashSearchPartnerSearchProvider({
      searchIndex: createSearchIndexMock(),
      indexName: "test-index",
    });

    const result = await provider.search({
      programId: document.programId,
      query: "drew moore",
      page: 1,
      pageSize: 10,
    });

    expect(result.hits).toHaveLength(10);
    expect(result.hits[0]).toEqual(
      expect.objectContaining({ id: "pge_0", score: 1 }),
    );
    expect(mocks.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: "drew moore", limit: 10 }),
    );

    const candidates = await provider.searchCandidates({
      programId: document.programId,
      query: "drew moore",
      limit: 10,
    });
    expect(candidates.hits).toHaveLength(10);
    expect(mocks.search).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "drew moore", limit: 10 }),
    );
  });

  it("leaves filtering and sorting to the database", async () => {
    const provider = createUpstashSearchPartnerSearchProvider({
      searchIndex: createSearchIndexMock(),
      indexName: "test-index",
    });

    await expect(
      provider.search({
        programId: document.programId,
        query: "rafi",
        page: 1,
        pageSize: 10,
        sort: { field: "totalSaleAmount", order: "desc" },
      }),
    ).rejects.toThrow("supports relevance ordering only");

    await expect(
      provider.search({
        programId: document.programId,
        query: "rafi",
        filters: { status: "approved" },
        page: 1,
        pageSize: 10,
      }),
    ).rejects.toThrow("filters must be applied by the database");
  });

  it("leaves counts and grouping to the database", async () => {
    const provider = createUpstashSearchPartnerSearchProvider({
      searchIndex: createSearchIndexMock(),
      indexName: "test-index",
    });
    const query = { programId: document.programId, query: "rafi" };

    await expect(provider.count(query)).rejects.toThrow(
      "counts must be calculated by the database",
    );
    await expect(provider.groupBy(query, "country")).rejects.toThrow(
      "groups must be calculated by the database",
    );
    expect(mocks.search).not.toHaveBeenCalled();
  });

  it("waits until pending documents finish indexing", async () => {
    vi.useFakeTimers();
    mocks.info
      .mockResolvedValueOnce({ documentCount: 1, pendingDocumentCount: 1 })
      .mockResolvedValueOnce({ documentCount: 2, pendingDocumentCount: 0 });
    const provider = createUpstashSearchPartnerSearchProvider({
      searchIndex: createSearchIndexMock(),
      indexName: "test-index",
    });

    try {
      const result = provider.waitForIndexing();
      await vi.advanceTimersByTimeAsync(100);
      await expect(result).resolves.toBeUndefined();
      expect(mocks.info).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("resets every document in the index in one operation", async () => {
    mocks.info.mockResolvedValue({
      documentCount: 100_005,
      pendingDocumentCount: 0,
    });

    await expect(
      resetUpstashSearchPartnerSearchIndex({
        searchIndex: createSearchIndexMock(),
        indexName: "test-index",
      }),
    ).resolves.toEqual({
      indexName: "test-index",
      documentCount: 100_005,
    });
    expect(mocks.reset).toHaveBeenCalledOnce();
  });
});
