import {
  createUpstashRedisPartnerSearchIndex,
  createUpstashRedisPartnerSearchProvider,
  PARTNER_SEARCH_CANDIDATE_LIMIT,
  type PartnerSearchDocument,
  upstashPartnerSearchSchema,
} from "@/lib/api/partners/search";
import type { Redis } from "@upstash/redis";
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
  createIndex: vi.fn(),
  del: vi.fn(),
  describe: vi.fn(),
  index: vi.fn(),
  jsonMset: vi.fn(),
  query: vi.fn(),
  waitIndexing: vi.fn(),
}));

function createRedisMock(): Redis {
  const searchIndex = {
    describe: mocks.describe,
    query: mocks.query,
    waitIndexing: mocks.waitIndexing,
  };

  mocks.index.mockReturnValue(searchIndex);
  mocks.createIndex.mockReturnValue(searchIndex);

  const redisMock = {
    del: mocks.del,
    json: {
      mset: mocks.jsonMset,
    },
    search: {
      createIndex: mocks.createIndex,
      index: mocks.index,
    },
  } as unknown as Redis;

  return redisMock;
}

describe("Upstash Redis partner search provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.del.mockResolvedValue(0);
    mocks.describe.mockResolvedValue({
      name: "test-index",
      dataType: "json",
      prefixes: ["test-index:partner:"],
      schema: upstashPartnerSearchSchema,
    });
    mocks.jsonMset.mockResolvedValue("OK");
    mocks.query.mockResolvedValue([]);
    mocks.waitIndexing.mockResolvedValue(1);
  });

  it("retrieves bounded relevance candidates without business filters", async () => {
    mocks.query.mockResolvedValue([
      {
        key: "test-index:partner:pge_test",
        score: 4,
        data: {},
      },
    ]);
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await expect(
      provider.searchCandidates({
        programId: document.programId,
        query: "rafi",
        limit: PARTNER_SEARCH_CANDIDATE_LIMIT,
      }),
    ).resolves.toEqual({
      hits: [{ id: document.id, score: 4 }],
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: PARTNER_SEARCH_CANDIDATE_LIMIT,
        select: {},
      }),
    );
    const request = mocks.query.mock.calls[0]![0];
    expect(request.offset).toBeUndefined();
    expect(request.orderBy).toBeUndefined();
    expect(JSON.stringify(request.filter)).toContain(
      '"programId":{"$eq":"prog_test"}',
    );
  });

  it("requires program-scoped text or partial email matches", async () => {
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await provider.searchCandidates({
      programId: document.programId,
      query: "examp",
      limit: 25,
    });

    const filter = mocks.query.mock.calls[0]![0].filter;
    expect(filter.$must).toBeUndefined();
    expect(filter.$should).toHaveLength(2);
    for (const branch of filter.$should) {
      expect(branch.$must).toEqual(
        expect.arrayContaining([{ programId: { $eq: "prog_test" } }]),
      );
    }
    expect(JSON.stringify(filter)).toContain('"emailNgrams":{"$eq":"exa"}');
    expect(JSON.stringify(filter)).toContain('"emailNgrams":{"$eq":"xam"}');
    expect(JSON.stringify(filter)).toContain('"emailNgrams":{"$eq":"amp"}');
  });

  it("exposes relevance-only behavior during the transition", async () => {
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    expect(provider.mode).toBe("relevance-only");
    await expect(
      provider.count({ programId: document.programId, query: "rafi" }),
    ).rejects.toThrow("counts must be calculated by the database");
    await expect(
      provider.groupBy(
        { programId: document.programId, query: "rafi" },
        "country",
      ),
    ).rejects.toThrow("groups must be calculated by the database");
  });

  it("retries a transient provider error", async () => {
    mocks.query
      .mockRejectedValueOnce(new Error("Upstash returned 503"))
      .mockResolvedValueOnce([]);
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await expect(
      provider.searchCandidates({
        programId: document.programId,
        query: "rafi",
        limit: 10,
      }),
    ).resolves.toEqual({ hits: [] });
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });

  it("does not retry a permanent provider error", async () => {
    mocks.query.mockRejectedValue(new Error("Invalid search filter"));
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await expect(
      provider.searchCandidates({
        programId: document.programId,
        query: "rafi",
        limit: 10,
      }),
    ).rejects.toThrow("Invalid search filter");
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("does not retry a request timeout after it consumes the query budget", async () => {
    mocks.query.mockRejectedValue(
      new DOMException(
        "The operation was aborted due to timeout",
        "TimeoutError",
      ),
    );
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await expect(
      provider.searchCandidates({
        programId: document.programId,
        query: "rafi",
        limit: 10,
      }),
    ).rejects.toThrow("The operation was aborted due to timeout");
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("allows query latency within the one-second deadline", async () => {
    vi.useFakeTimers();
    mocks.query.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 500)),
    );
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    try {
      const result = provider.searchCandidates({
        programId: document.programId,
        query: "rafi",
        limit: 10,
      });
      await vi.advanceTimersByTimeAsync(500);

      await expect(result).resolves.toEqual({ hits: [] });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("bounds the total query operation to one second", async () => {
    vi.useFakeTimers();
    mocks.query.mockImplementation(() => new Promise(() => {}));
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    try {
      const result = expect(
        provider.searchCandidates({
          programId: document.programId,
          query: "rafi",
          limit: 10,
        }),
      ).rejects.toThrow("Partner search query timed out after 1000ms");
      await vi.advanceTimersByTimeAsync(1_000);

      await result;
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("writes one lean search document per enrollment", async () => {
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await provider.upsert([document]);

    const entries = mocks.jsonMset.mock.calls[0]!;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      key: "test-index:partner:pge_test",
      path: "$",
      value: {
        programId: "prog_test",
        searchText: expect.any(String),
        emailNgrams: expect.any(String),
      },
    });
    expect(entries[0].value.searchText).toContain("partner@example.com");
    expect(entries[0].value.searchText).toContain("dub partners");
    expect(entries[0].value.searchText).toContain("rafi-on-x");
    expect(entries[0].value.searchText).toContain("referrals/rafi");
    expect(entries[0].value.emailNgrams).toContain("exa");
    expect(entries[0].value).not.toHaveProperty("partnerId");
    expect(entries[0].value).not.toHaveProperty("status");
    expect(entries[0].value).not.toHaveProperty("partnerTagIds");
    expect(entries[0].value).not.toHaveProperty("totalSaleAmount");
  });

  it("bounds Upstash write batches", async () => {
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });
    const documents = Array.from({ length: 101 }, (_, index) => ({
      ...document,
      id: `pge_${index}`,
      partnerTagIds: [],
    }));

    await provider.upsert(documents);

    expect(mocks.jsonMset).toHaveBeenCalledTimes(2);
    expect(mocks.jsonMset.mock.calls[0]).toHaveLength(100);
    expect(mocks.jsonMset.mock.calls[1]).toHaveLength(1);
  });

  it("deletes the enrollment document directly", async () => {
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await provider.delete([document.id]);

    expect(mocks.del).toHaveBeenCalledWith("test-index:partner:pge_test");
  });

  it("waits for pending index updates", async () => {
    vi.useFakeTimers();
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    try {
      await provider.waitForIndexing();

      expect(mocks.waitIndexing).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("creates the index explicitly with the partner-search prefix", async () => {
    const redisClient = createRedisMock();

    await createUpstashRedisPartnerSearchIndex({
      redisClient,
      indexName: "test-index",
    });

    expect(mocks.createIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "test-index",
        dataType: "json",
        prefix: "test-index:partner:",
        existsOk: true,
        skipInitialScan: true,
      }),
    );
    expect(Object.keys(upstashPartnerSearchSchema).sort()).toEqual([
      "emailNgrams",
      "programId",
      "searchText",
    ]);
  });

  it("rejects an existing index with a stale schema", async () => {
    mocks.describe.mockResolvedValue({
      name: "test-index",
      dataType: "json",
      prefixes: ["test-index:partner:"],
      schema: { id: { type: "KEYWORD" } },
    });

    await expect(
      createUpstashRedisPartnerSearchIndex({
        redisClient: createRedisMock(),
        indexName: "test-index",
      }),
    ).rejects.toThrow("Delete and recreate it before backfilling");
  });
});
