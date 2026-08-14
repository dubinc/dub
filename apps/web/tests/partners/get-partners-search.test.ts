import { getPartners } from "@/lib/api/partners/get-partners";
import { PartnerSearchProvider } from "@/lib/api/partners/search";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  sanitizeFullTextSearch: (value: string) => value,
  prisma: {
    programEnrollment: {
      findMany: mocks.findMany,
    },
  },
}));

function enrollment(id: string, partnerId: string) {
  return {
    id,
    programId: "prog_test",
    partnerId,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    totalSaleAmount: BigInt(0),
    totalCommissions: BigInt(0),
    partner: {
      id: partnerId,
      programPartnerTags: [],
      platforms: [],
    },
    links: [],
  };
}

function createSearchProvider(
  hits: { id: string }[] = [],
): PartnerSearchProvider {
  return {
    searchCandidates: vi.fn().mockResolvedValue({ hits }),
    upsert: vi.fn(),
    delete: vi.fn(),
  };
}

describe("getPartners search", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("keeps a tenant filter on the database search path", async () => {
    // tenantId predates the search provider, so `tenantId` + `search` still
    // resolves entirely in the database rather than inheriting the candidate
    // ceiling.
    mocks.findMany.mockResolvedValue([enrollment("pge_1", "pn_1")]);
    const searchProvider = createSearchProvider([{ id: "pge_1" }]);

    await getPartners(
      {
        programId: "prog_test",
        search: "examp",
        tenantId: "tenant_1",
        page: 1,
        pageSize: 25,
        sortBy: "totalSaleAmount",
        sortOrder: "desc",
      },
      { searchProvider },
    );

    expect(searchProvider.searchCandidates).not.toHaveBeenCalled();

    const { where } = mocks.findMany.mock.calls.at(-1)![0];
    expect(where).toMatchObject({ tenantId: "tenant_1" });
    expect(where.id).toBeUndefined();
    expect(JSON.stringify(where)).toContain('"search":"examp"');
  });

  it("lets the database filter, sort, and paginate search candidates", async () => {
    mocks.findMany.mockResolvedValue([
      enrollment("pge_1", "pn_1"),
      enrollment("pge_2", "pn_2"),
    ]);
    const searchProvider = createSearchProvider([
      { id: "pge_2" },
      { id: "pge_1" },
    ]);

    const partners = await getPartners(
      {
        programId: "prog_test",
        search: "examp",
        page: 1,
        pageSize: 25,
        sortBy: "totalSaleAmount",
        sortOrder: "desc",
        status: "approved",
      },
      { searchProvider },
    );

    // The status filter reaches the provider, so it narrows before the ranking
    // truncates rather than after.
    expect(searchProvider.searchCandidates).toHaveBeenCalledWith({
      programId: "prog_test",
      query: "examp",
      limit: 999,
      filters: {
        status: { values: ["approved"], exclude: false },
        groupId: undefined,
        country: undefined,
        partnerTagIds: undefined,
      },
    });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          programId: "prog_test",
          status: "approved",
          id: { in: ["pge_2", "pge_1"] },
        }),
        take: 25,
        skip: 0,
        orderBy: { totalSaleAmount: "desc" },
      }),
    );
    expect(partners.map(({ id }) => id)).toEqual(["pn_1", "pn_2"]);
  });

  it("hydrates only the requested page, in relevance order", async () => {
    // Relevance order cannot be expressed in SQL, so the page is chosen in
    // memory. The first query resolves surviving candidates as bare IDs; only
    // the page itself is hydrated.
    mocks.findMany
      .mockResolvedValueOnce([{ id: "pge_3" }, { id: "pge_1" }])
      .mockResolvedValueOnce([enrollment("pge_3", "pn_3")]);
    const searchProvider = createSearchProvider([
      { id: "pge_1" },
      { id: "pge_2" },
      { id: "pge_3" },
    ]);

    const partners = await getPartners(
      {
        programId: "prog_test",
        search: "examp",
        page: 2,
        pageSize: 1,
        sortBy: "relevance",
        sortOrder: "desc",
      },
      { searchProvider },
    );

    const [idQuery] = mocks.findMany.mock.calls[0];
    expect(idQuery.select).toEqual({ id: true });
    expect(idQuery.include).toBeUndefined();

    // pge_1 ranks first and lands on page 1, so page 2 asks only for pge_3.
    const [pageQuery] = mocks.findMany.mock.calls[1];
    expect(pageQuery.where).toEqual({ id: { in: ["pge_3"] } });
    expect(pageQuery.include).toBeDefined();
    expect(pageQuery.take).toBeUndefined();

    expect(partners.map(({ id }) => id)).toEqual(["pn_3"]);
  });

  it("skips the hydration query when the page is empty", async () => {
    mocks.findMany.mockResolvedValueOnce([{ id: "pge_1" }]);
    const searchProvider = createSearchProvider([{ id: "pge_1" }]);

    const partners = await getPartners(
      {
        programId: "prog_test",
        search: "examp",
        page: 5,
        pageSize: 25,
        sortBy: "relevance",
        sortOrder: "desc",
      },
      { searchProvider },
    );

    expect(partners).toEqual([]);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });

  it("falls back to the database search path when the provider fails", async () => {
    const searchProvider = createSearchProvider();
    vi.mocked(searchProvider.searchCandidates).mockRejectedValue(
      new Error("Provider Connection Timeout"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findMany.mockResolvedValue([enrollment("pge_1", "pn_1")]);

    const partners = await getPartners(
      {
        programId: "prog_test",
        search: "examp",
        page: 1,
        pageSize: 25,
        sortBy: "totalSaleAmount",
        sortOrder: "desc",
      },
      { searchProvider },
    );

    expect(partners).toHaveLength(1);

    // The database keeps its own search predicate and no candidate filter.
    const { where } = mocks.findMany.mock.calls.at(-1)![0];
    expect(where.id).toBeUndefined();
    expect(JSON.stringify(where)).toContain('"search":"examp"');
    vi.mocked(console.error).mockRestore();
  });

  it("surfaces provider errors when the caller opts out of the fallback", async () => {
    const searchProvider = createSearchProvider();
    vi.mocked(searchProvider.searchCandidates).mockRejectedValue(
      new Error("Provider Connection Timeout"),
    );

    await expect(
      getPartners(
        {
          programId: "prog_test",
          search: "examp",
          page: 1,
          pageSize: 25,
          sortBy: "totalSaleAmount",
          sortOrder: "desc",
        },
        { searchProvider, throwOnSearchError: true },
      ),
    ).rejects.toThrow("Provider Connection Timeout");
  });

  it("uses the existing database sort when relevance has no provider", async () => {
    mocks.findMany.mockResolvedValue([]);

    await getPartners(
      {
        programId: "prog_test",
        search: "examp",
        page: 1,
        pageSize: 25,
        sortBy: "relevance",
        sortOrder: "desc",
      },
      { searchProvider: null },
    );

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { totalSaleAmount: "desc" },
      }),
    );
  });
});
