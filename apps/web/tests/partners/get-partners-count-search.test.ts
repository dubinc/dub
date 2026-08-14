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

function createSearchProvider(total = 12_000): PartnerSearchProvider {
  return {
    searchCandidates: vi.fn().mockResolvedValue({
      hits: [{ id: "pge_2" }, { id: "pge_1" }],
    }),
    countCandidates: vi.fn().mockResolvedValue(total),
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

  it("reports the provider's real total, not the truncated candidate count", async () => {
    // Counting the hits would report the candidate ceiling as the answer.
    const searchProvider = createSearchProvider(12_000);
    mocks.count.mockResolvedValue(999);

    const count = await getPartnersCount<number>(
      {
        programId: "prog_test",
        search: "examp",
        status: "approved",
        country: ["CA"],
      },
      { searchProvider },
    );

    expect(count).toBe(12_000);
    expect(searchProvider.countCandidates).toHaveBeenCalledWith({
      programId: "prog_test",
      query: "examp",
      limit: 999,
      filters: {
        status: { values: ["approved"], exclude: false },
        groupId: undefined,
        country: { values: ["CA"], exclude: false },
        partnerTagIds: undefined,
      },
    });
    expect(mocks.count).not.toHaveBeenCalled();
  });

  it.each([
    ["a tenant ID", { tenantId: "tenant_1" }],
    ["explicit partner IDs", { partnerIds: ["pn_1"] }],
    ["a metric range", { totalClicksMin: 10 }],
    ["a referral filter", { referredByPartnerId: "pn_referrer" }],
  ])(
    "falls back to the database count when the provider cannot see %s",
    async (_label, extra) => {
      // The aggregation only knows the filters it was given, so counting with
      // one of these applied would over-count.
      const searchProvider = createSearchProvider(12_000);
      mocks.count.mockResolvedValue(3);

      const count = await getPartnersCount<number>(
        { programId: "prog_test", search: "examp", ...extra },
        { searchProvider },
      );

      expect(count).toBe(3);
      expect(searchProvider.countCandidates).not.toHaveBeenCalled();
      expect(mocks.count).toHaveBeenCalled();
    },
  );

  it("falls back to the database count when the aggregation fails", async () => {
    const searchProvider = createSearchProvider();
    (
      searchProvider.countCandidates as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error("aggregation down"));
    mocks.count.mockResolvedValue(7);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const count = await getPartnersCount<number>(
      { programId: "prog_test", search: "examp" },
      { searchProvider },
    );

    expect(count).toBe(7);
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

  it("does not re-apply the database full-text search to grouped counts", async () => {
    // The provider already resolved the query into candidate IDs. ANDing the
    // database full-text predicate on top would drop every match the database
    // cannot find on its own, which is exactly what the search index is for.
    mocks.enrollmentGroupBy.mockResolvedValue([]);
    mocks.partnerGroupBy.mockResolvedValue([]);
    mocks.partnerTagGroupBy.mockResolvedValue([]);
    mocks.applicationEventGroupBy.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);

    const groupings = [
      { groupBy: "status", mock: mocks.enrollmentGroupBy, extra: {} },
      { groupBy: "groupId", mock: mocks.enrollmentGroupBy, extra: {} },
      { groupBy: "country", mock: mocks.partnerGroupBy, extra: {} },
      { groupBy: "partnerTagId", mock: mocks.partnerTagGroupBy, extra: {} },
      {
        groupBy: "referredByPartnerId",
        mock: mocks.applicationEventGroupBy,
        extra: {},
      },
      // The ungrouped count only reaches the database when a filter the provider
      // cannot see forces it to, so give it one.
      { groupBy: undefined, mock: mocks.count, extra: { totalClicksMin: 1 } },
    ] as const;

    for (const { groupBy, mock, extra } of groupings) {
      mock.mockClear();

      await getPartnersCount(
        {
          programId: "prog_test",
          search: "examp",
          ...extra,
          ...(groupBy && { groupBy }),
        },
        { searchProvider: createSearchProvider() },
      );

      const { where } = mock.mock.calls.at(-1)![0];
      expect(
        JSON.stringify(where),
        `groupBy: ${groupBy ?? "none"}`,
      ).not.toContain('"search":"examp"');
      expect(JSON.stringify(where), `groupBy: ${groupBy ?? "none"}`).toContain(
        '"id":{"in":["pge_2","pge_1"]}',
      );
    }
  });

  it("keeps the database full-text search when no provider is configured", async () => {
    mocks.enrollmentGroupBy.mockResolvedValue([]);

    await getPartnersCount(
      { programId: "prog_test", search: "examp", groupBy: "status" },
      { searchProvider: null },
    );

    const { where } = mocks.enrollmentGroupBy.mock.calls.at(-1)![0];
    expect(JSON.stringify(where)).toContain('"search":"examp"');
  });

  it("falls back to the database search path when the provider fails", async () => {
    const searchProvider = createSearchProvider();
    vi.mocked(searchProvider.searchCandidates).mockRejectedValue(
      new Error("Provider Connection Timeout"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.count.mockResolvedValue(7);

    const count = await getPartnersCount<number>(
      { programId: "prog_test", search: "examp" },
      { searchProvider },
    );

    expect(count).toBe(7);

    const { where } = mocks.count.mock.calls.at(-1)![0];
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
      getPartnersCount<number>(
        { programId: "prog_test", search: "examp" },
        { searchProvider, throwOnSearchError: true },
      ),
    ).rejects.toThrow("Provider Connection Timeout");
  });
});
