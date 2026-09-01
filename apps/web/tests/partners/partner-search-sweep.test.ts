import {
  PARTNER_SEARCH_SWEEP_TIME_BUDGET_MS,
  partnerSearchDocumentSelect,
  sweepPartnerSearch,
  type PartnerSearchDocumentSource,
  type PartnerSearchProvider,
} from "@/lib/api/partners/search";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    programEnrollment: {
      findMany: mocks.findMany,
    },
  },
}));

function createSource(id: string): PartnerSearchDocumentSource {
  return {
    id,
    programId: "prog_test",
    partnerId: `pn_${id}`,
    status: "approved" as const,
    groupId: null,
    partner: {
      name: "Rafi Hasan",
      email: "partner@example.com",
      companyName: null,
      description: null,
      country: null,
      programPartnerTags: [],
      platforms: [],
    },
    links: [],
  };
}

function createProvider(): PartnerSearchProvider {
  return {
    searchCandidates: vi.fn(),
    countCandidates: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  };
}

describe("sweepPartnerSearch", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("re-indexes the whole corpus rather than a filtered slice", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([createSource("pge_1")]);

    await sweepPartnerSearch({ batchSize: 2, searchProvider });

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {},
      select: partnerSearchDocumentSelect,
      orderBy: { id: "asc" },
      take: 2,
    });
  });

  it("reports the pass as done when a page comes back short", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([createSource("pge_1")]);

    const result = await sweepPartnerSearch({ batchSize: 2, searchProvider });

    expect(result).toEqual({
      processed: 1,
      lastDocumentId: "pge_1",
      done: true,
    });
  });

  it("stops at the time budget and returns a resumable cursor", async () => {
    const searchProvider = createProvider();
    mocks.findMany
      .mockResolvedValueOnce([createSource("pge_1"), createSource("pge_2")])
      .mockResolvedValueOnce([createSource("pge_3"), createSource("pge_4")]);

    // Each batch costs 40s against a 60s budget, so the second one crosses it.
    let clock = 0;
    const now = () => (clock += 40_000);

    const result = await sweepPartnerSearch({
      batchSize: 2,
      timeBudgetMs: 60_000,
      now,
      searchProvider,
    });

    expect(result).toEqual({
      processed: 4,
      lastDocumentId: "pge_4",
      done: false,
    });
    expect(mocks.findMany).toHaveBeenCalledTimes(2);
  });

  // Otherwise a hop that starts with no time left makes no progress, and the
  // pass retries the same cursor forever without advancing.
  it("always indexes at least one batch, however tight the budget", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([
      createSource("pge_1"),
      createSource("pge_2"),
    ]);

    // Budget already blown by the time the first batch finishes.
    let reads = 0;
    const now = () => (reads++ === 0 ? 0 : 10_000);

    const result = await sweepPartnerSearch({
      batchSize: 2,
      timeBudgetMs: 1,
      now,
      searchProvider,
    });

    expect(result.processed).toBe(2);
    expect(result.lastDocumentId).toBe("pge_2");
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });

  it("reports done rather than exhausted when the range runs out first", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([createSource("pge_1")]);

    const result = await sweepPartnerSearch({
      batchSize: 2,
      timeBudgetMs: 60_000,
      now: () => 0,
      searchProvider,
    });

    expect(result.done).toBe(true);
  });

  it("resumes from the cursor it was given", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([]);

    await sweepPartnerSearch({
      after: "pge_100",
      batchSize: 2,
      searchProvider,
    });

    expect(mocks.findMany.mock.calls[0][0].where).toEqual({
      id: { gt: "pge_100" },
    });
  });

  it("never deletes, because an out-of-range id looks the same as a missing one", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([createSource("pge_1")]);

    await sweepPartnerSearch({ batchSize: 2, searchProvider });

    expect(searchProvider.delete).not.toHaveBeenCalled();
    expect(searchProvider.upsert).toHaveBeenCalledTimes(1);
  });

  it("requires a configured provider", async () => {
    await expect(sweepPartnerSearch({ searchProvider: null })).rejects.toThrow(
      "Partner search provider is not configured.",
    );

    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects a non-positive batch size", async () => {
    const searchProvider = createProvider();

    await expect(
      sweepPartnerSearch({ batchSize: 0, searchProvider }),
    ).rejects.toThrow("Batch size must be a positive integer.");

    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects a non-positive time budget", async () => {
    const searchProvider = createProvider();

    await expect(
      sweepPartnerSearch({ timeBudgetMs: 0, searchProvider }),
    ).rejects.toThrow("Time budget must be a positive integer.");
  });

  // The hop budget is only meaningful if it finishes well inside the function
  // limit, since the batch in flight when it expires cannot be interrupted.
  it("leaves the job route room to finish the batch in flight", () => {
    const JOB_ROUTE_MAX_DURATION_MS = 600_000;

    expect(PARTNER_SEARCH_SWEEP_TIME_BUDGET_MS).toBeLessThanOrEqual(
      JOB_ROUTE_MAX_DURATION_MS / 2,
    );
  });
});
