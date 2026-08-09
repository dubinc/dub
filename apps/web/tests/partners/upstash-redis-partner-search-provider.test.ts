import {
  createUpstashRedisPartnerSearchIndex,
  createUpstashRedisPartnerSearchProvider,
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
  aggregate: vi.fn(),
  count: vi.fn(),
  createIndex: vi.fn(),
  del: vi.fn(),
  describe: vi.fn(),
  index: vi.fn(),
  jsonMget: vi.fn(),
  jsonMset: vi.fn(),
  query: vi.fn(),
  waitIndexing: vi.fn(),
}));

function createRedisMock(): Redis {
  const searchIndex = {
    aggregate: mocks.aggregate,
    count: mocks.count,
    describe: mocks.describe,
    query: mocks.query,
    waitIndexing: mocks.waitIndexing,
  };

  mocks.index.mockReturnValue(searchIndex);
  mocks.createIndex.mockReturnValue(searchIndex);

  return {
    del: mocks.del,
    json: {
      mget: mocks.jsonMget,
      mset: mocks.jsonMset,
    },
    search: {
      createIndex: mocks.createIndex,
      index: mocks.index,
    },
  } as unknown as Redis;
}

describe("Upstash Redis partner search provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.aggregate.mockResolvedValue({
      groups: { buckets: [], sumOtherDocCount: 0 },
    });
    mocks.count.mockResolvedValue({ count: 0 });
    mocks.del.mockResolvedValue(0);
    mocks.describe.mockResolvedValue({
      name: "test-index",
      dataType: "json",
      prefixes: ["test-index:"],
      schema: upstashPartnerSearchSchema,
    });
    mocks.jsonMget.mockResolvedValue([]);
    mocks.jsonMset.mockResolvedValue("OK");
    mocks.query.mockResolvedValue([]);
    mocks.waitIndexing.mockResolvedValue(1);
  });

  it("searches within the program and supports partial email matching", async () => {
    mocks.query.mockResolvedValue([
      {
        key: "test-index:partner:pge_test",
        score: 2,
        data: { id: document.id, partnerId: document.partnerId },
      },
    ]);
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    const result = await provider.search({
      programId: document.programId,
      query: "examp",
      page: 3,
      pageSize: 25,
      sort: { field: "totalSaleAmount", order: "desc" },
    });

    expect(result).toEqual({
      hits: [{ id: document.id, partnerId: document.partnerId, score: 2 }],
    });
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 25,
        offset: 50,
        orderBy: { totalSaleAmount: "DESC" },
        select: { id: true, partnerId: true },
      }),
    );

    const filter = mocks.query.mock.calls[0]![0].filter;
    expect(JSON.stringify(filter)).toContain('"programId":{"$eq":"prog_test"}');
    expect(JSON.stringify(filter)).toContain(
      '"documentType":{"$eq":"partner"}',
    );
    expect(JSON.stringify(filter)).toContain('"emailNgrams":"exa"');
    expect(JSON.stringify(filter)).toContain('"emailNgrams":"xam"');
    expect(JSON.stringify(filter)).toContain('"emailNgrams":"amp"');
  });

  it("passes list exclusions and metric ranges to Upstash", async () => {
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await provider.count({
      programId: document.programId,
      query: "rafi",
      filters: {
        countries: { values: ["US", "CA"], operator: "NOT_IN" },
        partnerTagIds: { values: ["ptag_test"], operator: "IN" },
        metrics: { totalSaleAmount: { min: 100, max: 1_000 } },
      },
    });

    const filter = mocks.count.mock.calls[0]![0].filter;
    expect(filter.$must).toEqual(
      expect.arrayContaining([
        { partnerTagIds: { $in: ["ptag_test"] } },
        { totalSaleAmount: { $gte: 100, $lte: 1_000 } },
      ]),
    );
    expect(filter.$mustNot).toEqual([{ country: { $in: ["US", "CA"] } }]);
  });

  it("retries a transient provider error", async () => {
    mocks.count
      .mockRejectedValueOnce(new Error("Upstash returned 503"))
      .mockResolvedValueOnce({ count: 1 });
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await expect(
      provider.count({ programId: document.programId, query: "rafi" }),
    ).resolves.toBe(1);
    expect(mocks.count).toHaveBeenCalledTimes(2);
  });

  it("does not retry a permanent provider error", async () => {
    mocks.count.mockRejectedValue(new Error("Invalid search filter"));
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await expect(
      provider.count({ programId: document.programId, query: "rafi" }),
    ).rejects.toThrow("Invalid search filter");
    expect(mocks.count).toHaveBeenCalledTimes(1);
  });

  it("writes the partner document and tag shadow documents", async () => {
    mocks.jsonMget.mockResolvedValue([null]);
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await provider.upsert([document]);

    expect(mocks.jsonMget).toHaveBeenCalledWith(
      ["test-index:partner:pge_test"],
      "$",
    );
    const entries = mocks.jsonMset.mock.calls[0]!;
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        key: "test-index:partner:pge_test",
        path: "$",
        value: expect.objectContaining({
          documentType: "partner",
          partnerTagIds: "ptag_test",
          partnerTagIdsRaw: ["ptag_test"],
          tenantId: "__none__",
        }),
      }),
    );
    expect(entries[1]).toEqual(
      expect.objectContaining({
        key: "test-index:tag:pge_test:ptag_test",
        value: expect.objectContaining({
          documentType: "tag",
          partnerTagId: "ptag_test",
        }),
      }),
    );
    expect(entries[0].value.searchText).toContain("partner@example.com");
    expect(entries[0].value.searchText).toContain("dub partners");
    expect(entries[0].value.searchText).toContain("rafi-on-x");
    expect(entries[0].value.searchText).toContain("referrals/rafi");
    expect(entries[0].value.emailNgrams).toContain("exa");
  });

  it("removes stale tag shadow documents before updating", async () => {
    mocks.jsonMget.mockResolvedValue([
      [{ partnerTagIdsRaw: ["ptag_old", "ptag_test"] }],
    ]);
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await provider.upsert([document]);

    expect(mocks.del).toHaveBeenCalledWith("test-index:tag:pge_test:ptag_old");
    expect(mocks.del.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.jsonMset.mock.invocationCallOrder[0]!,
    );
  });

  it("bounds Upstash write batches", async () => {
    mocks.jsonMget.mockImplementation(async (keys: string[]) =>
      keys.map(() => null),
    );
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

    expect(mocks.jsonMget).toHaveBeenCalledTimes(2);
    expect(mocks.jsonMset).toHaveBeenCalledTimes(2);
    expect(mocks.jsonMset.mock.calls[0]).toHaveLength(100);
    expect(mocks.jsonMset.mock.calls[1]).toHaveLength(1);
  });

  it("deletes the partner document and its tag shadow documents", async () => {
    mocks.jsonMget.mockResolvedValue([
      [{ partnerTagIdsRaw: ["ptag_one", "ptag_two"] }],
    ]);
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await provider.delete([document.id]);

    expect(mocks.del).toHaveBeenCalledWith(
      "test-index:partner:pge_test",
      "test-index:tag:pge_test:ptag_one",
      "test-index:tag:pge_test:ptag_two",
    );
  });

  it("groups partner tags using tag shadow documents", async () => {
    mocks.aggregate.mockResolvedValue({
      groups: {
        buckets: [{ key: "ptag_test", docCount: 12 }],
        sumOtherDocCount: 0,
      },
    });
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await expect(
      provider.groupBy(
        { programId: document.programId, query: "rafi" },
        "partnerTagId",
      ),
    ).resolves.toEqual([{ value: "ptag_test", count: 12 }]);

    const request = mocks.aggregate.mock.calls[0]![0];
    expect(request.aggregations.groups.$terms.field).toBe("partnerTagId");
    expect(JSON.stringify(request.filter)).toContain(
      '"documentType":{"$eq":"tag"}',
    );
  });

  it("waits for pending index updates", async () => {
    const provider = createUpstashRedisPartnerSearchProvider({
      redisClient: createRedisMock(),
      indexName: "test-index",
    });

    await provider.waitForIndexing();

    expect(mocks.waitIndexing).toHaveBeenCalledOnce();
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
        prefix: "test-index:",
        existsOk: true,
        skipInitialScan: true,
      }),
    );
  });

  it("rejects an existing index with a stale schema", async () => {
    mocks.describe.mockResolvedValue({
      name: "test-index",
      dataType: "json",
      prefixes: ["test-index:"],
      schema: { id: { type: "KEYWORD" } },
    });

    await expect(
      createUpstashRedisPartnerSearchIndex({
        redisClient: createRedisMock(),
        indexName: "test-index",
      }),
    ).rejects.toThrow("Create a new versioned index");
  });
});
