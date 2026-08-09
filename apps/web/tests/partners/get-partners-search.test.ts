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

describe("getPartners search", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("hydrates provider hits from the database in provider order", async () => {
    mocks.findMany.mockResolvedValue([
      enrollment("pge_1", "pn_1"),
      enrollment("pge_2", "pn_2"),
    ]);
    const searchProvider: PartnerSearchProvider = {
      searchCandidates: vi.fn(),
      search: vi.fn().mockResolvedValue({
        hits: [
          { id: "pge_2", partnerId: "pn_2" },
          { id: "pge_1", partnerId: "pn_1" },
        ],
      }),
      count: vi.fn(),
      groupBy: vi.fn(),
      waitForIndexing: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    };

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

    expect(searchProvider.search).toHaveBeenCalledWith(
      expect.objectContaining({
        programId: "prog_test",
        query: "examp",
        page: 1,
        pageSize: 25,
      }),
    );
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          programId: "prog_test",
          id: { in: ["pge_2", "pge_1"] },
        },
      }),
    );
    expect(partners.map(({ id }) => id)).toEqual(["pn_2", "pn_1"]);
  });

  it("propagates search provider errors", async () => {
    const searchProvider: PartnerSearchProvider = {
      searchCandidates: vi.fn(),
      search: vi
        .fn()
        .mockRejectedValue(new Error("Provider Connection Timeout")),
      count: vi.fn(),
      groupBy: vi.fn(),
      waitForIndexing: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    };

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
