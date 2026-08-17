import {
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

  it("stops at the batch ceiling and returns a resumable cursor", async () => {
    const searchProvider = createProvider();
    mocks.findMany
      .mockResolvedValueOnce([createSource("pge_1"), createSource("pge_2")])
      .mockResolvedValueOnce([createSource("pge_3"), createSource("pge_4")]);

    const result = await sweepPartnerSearch({
      batchSize: 2,
      maxBatches: 2,
      searchProvider,
    });

    expect(result).toEqual({
      processed: 4,
      lastDocumentId: "pge_4",
      done: false,
    });
    expect(mocks.findMany).toHaveBeenCalledTimes(2);
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

  it("narrows to enrollment and partner timestamps in watermark mode", async () => {
    const searchProvider = createProvider();
    const since = new Date("2026-08-01T00:00:00.000Z");
    mocks.findMany.mockResolvedValueOnce([]);

    await sweepPartnerSearch({ since, batchSize: 2, searchProvider });

    expect(mocks.findMany.mock.calls[0][0].where).toEqual({
      OR: [
        { updatedAt: { gte: since } },
        { partner: { updatedAt: { gte: since } } },
      ],
    });
  });

  it("keeps the watermark filter alongside the cursor when resuming", async () => {
    const searchProvider = createProvider();
    const since = new Date("2026-08-01T00:00:00.000Z");
    mocks.findMany.mockResolvedValueOnce([]);

    await sweepPartnerSearch({
      since,
      after: "pge_5",
      batchSize: 2,
      searchProvider,
    });

    expect(mocks.findMany.mock.calls[0][0].where).toEqual({
      OR: [
        { updatedAt: { gte: since } },
        { partner: { updatedAt: { gte: since } } },
      ],
      id: { gt: "pge_5" },
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

  it("rejects a non-positive batch ceiling", async () => {
    const searchProvider = createProvider();

    await expect(
      sweepPartnerSearch({ maxBatches: 0, searchProvider }),
    ).rejects.toThrow("Max batches must be a positive integer.");
  });
});
