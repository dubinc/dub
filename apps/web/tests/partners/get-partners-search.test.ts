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
  hits: { id: string; partnerId: string }[] = [],
): PartnerSearchProvider {
  return {
    searchCandidates: vi.fn().mockResolvedValue({ hits }),
    search: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    waitForIndexing: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  };
}

describe("getPartners search", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("lets the database filter, sort, and paginate search candidates", async () => {
    mocks.findMany.mockResolvedValue([
      enrollment("pge_1", "pn_1"),
      enrollment("pge_2", "pn_2"),
    ]);
    const searchProvider = createSearchProvider([
      { id: "pge_2", partnerId: "pn_2" },
      { id: "pge_1", partnerId: "pn_1" },
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

    expect(searchProvider.searchCandidates).toHaveBeenCalledWith({
      programId: "prog_test",
      query: "examp",
      limit: 100,
    });
    expect(searchProvider.search).not.toHaveBeenCalled();
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

  it("restores relevance order before slicing a page", async () => {
    mocks.findMany.mockResolvedValue([
      enrollment("pge_3", "pn_3"),
      enrollment("pge_1", "pn_1"),
    ]);
    const searchProvider = createSearchProvider([
      { id: "pge_1", partnerId: "pn_1" },
      { id: "pge_2", partnerId: "pn_2" },
      { id: "pge_3", partnerId: "pn_3" },
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

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({
        take: expect.anything(),
        skip: expect.anything(),
        orderBy: expect.anything(),
      }),
    );
    expect(partners.map(({ id }) => id)).toEqual(["pn_3"]);
  });

  it("propagates search provider errors", async () => {
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
        { searchProvider },
      ),
    ).rejects.toThrow("Provider Connection Timeout");

    expect(mocks.findMany).not.toHaveBeenCalled();
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
