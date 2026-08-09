import { getPartnersCount } from "@/lib/api/partners/get-partners-count";
import { PartnerSearchProvider } from "@/lib/api/partners/search";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  enrollmentGroupBy: vi.fn(),
  partnerGroupBy: vi.fn(),
  partnerTagGroupBy: vi.fn(),
  applicationEventGroupBy: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  sanitizeFullTextSearch: (value: string) => value,
  prisma: {
    programEnrollment: {
      count: mocks.count,
      groupBy: mocks.enrollmentGroupBy,
    },
    partner: { groupBy: mocks.partnerGroupBy },
    programPartnerTag: { groupBy: mocks.partnerTagGroupBy },
    programApplicationEvent: { groupBy: mocks.applicationEventGroupBy },
  },
}));

function createSearchProvider(): PartnerSearchProvider {
  return {
    searchCandidates: vi.fn().mockResolvedValue({
      hits: [{ id: "pge_2" }, { id: "pge_1" }],
    }),
    waitForIndexing: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  };
}

describe("getPartnersCount search", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
  });

  it("counts database-filtered relevance candidates", async () => {
    const searchProvider = createSearchProvider();
    mocks.count.mockResolvedValue(1);

    const count = await getPartnersCount<number>(
      {
        programId: "prog_test",
        search: "examp",
        status: "approved",
        country: ["CA"],
      },
      { searchProvider },
    );

    expect(count).toBe(1);
    expect(searchProvider.searchCandidates).toHaveBeenCalledWith({
      programId: "prog_test",
      query: "examp",
      limit: 100,
    });
    expect(mocks.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        programId: "prog_test",
        status: "approved",
        id: { in: ["pge_2", "pge_1"] },
        partner: { country: "CA" },
      }),
    });
  });

  it("groups database-filtered relevance candidates", async () => {
    const searchProvider = createSearchProvider();
    mocks.enrollmentGroupBy.mockResolvedValue([
      { status: "approved", _count: 1 },
    ]);

    const groups = await getPartnersCount<{ status: string; _count: number }[]>(
      { programId: "prog_test", search: "examp", groupBy: "status" },
      { searchProvider },
    );

    expect(mocks.enrollmentGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["status"],
        where: expect.objectContaining({
          programId: "prog_test",
          id: { in: ["pge_2", "pge_1"] },
        }),
      }),
    );
    expect(groups).toEqual(
      expect.arrayContaining([
        { status: "approved", _count: 1 },
        { status: "pending", _count: 0 },
      ]),
    );
  });

  it("scopes every database grouping path to relevance candidates", async () => {
    const searchProvider = createSearchProvider();
    mocks.partnerGroupBy.mockResolvedValue([]);
    mocks.partnerTagGroupBy.mockResolvedValue([]);
    mocks.applicationEventGroupBy.mockResolvedValue([]);

    await getPartnersCount(
      {
        programId: "prog_test",
        search: "examp",
        groupBy: "country",
      },
      { searchProvider },
    );
    expect(mocks.partnerGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          programs: {
            some: expect.objectContaining({
              id: { in: ["pge_2", "pge_1"] },
            }),
          },
        }),
      }),
    );

    await getPartnersCount(
      {
        programId: "prog_test",
        search: "examp",
        groupBy: "partnerTagId",
      },
      { searchProvider },
    );
    expect(mocks.partnerTagGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          programEnrollment: expect.objectContaining({
            id: { in: ["pge_2", "pge_1"] },
          }),
        }),
      }),
    );

    await getPartnersCount(
      {
        programId: "prog_test",
        search: "examp",
        groupBy: "referredByPartnerId",
      },
      { searchProvider },
    );
    expect(mocks.applicationEventGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          programEnrollment: expect.objectContaining({
            id: { in: ["pge_2", "pge_1"] },
          }),
        }),
      }),
    );
  });

  it("propagates search provider errors", async () => {
    const searchProvider = createSearchProvider();
    vi.mocked(searchProvider.searchCandidates).mockRejectedValue(
      new Error("Provider Connection Timeout"),
    );

    await expect(
      getPartnersCount<number>(
        { programId: "prog_test", search: "examp" },
        { searchProvider },
      ),
    ).rejects.toThrow("Provider Connection Timeout");
  });
});
