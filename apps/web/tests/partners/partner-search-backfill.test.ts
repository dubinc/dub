import {
  backfillPartnerSearch,
  partnerSearchDocumentSelect,
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
    partner: {
      name: "Rafi Hasan",
      email: "partner@example.com",
      companyName: "Dub Partners",
      description: "Developer tools educator",
      platforms: [],
    },
    links: [],
  };
}

function createProvider(): PartnerSearchProvider {
  return {
    searchCandidates: vi.fn(),
    waitForIndexing: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  };
}

describe("backfillPartnerSearch", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("indexes documents in keyset-paginated batches", async () => {
    const searchProvider = createProvider();
    const onProgress = vi.fn();
    mocks.findMany
      .mockResolvedValueOnce([createSource("pge_1"), createSource("pge_2")])
      .mockResolvedValueOnce([createSource("pge_3")]);

    const result = await backfillPartnerSearch({
      programId: "prog_test",
      batchSize: 2,
      searchProvider,
      onProgress,
    });

    expect(mocks.findMany).toHaveBeenNthCalledWith(1, {
      where: { programId: "prog_test" },
      select: partnerSearchDocumentSelect,
      orderBy: { id: "asc" },
      take: 2,
    });
    expect(mocks.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        programId: "prog_test",
        id: { gt: "pge_2" },
      },
      select: partnerSearchDocumentSelect,
      orderBy: { id: "asc" },
      take: 2,
    });
    expect(searchProvider.upsert).toHaveBeenCalledTimes(2);
    expect(searchProvider.waitForIndexing).toHaveBeenCalledOnce();
    expect(onProgress).toHaveBeenLastCalledWith({
      batchSize: 1,
      processed: 3,
      lastDocumentId: "pge_3",
    });
    expect(result).toEqual({
      processed: 3,
      lastDocumentId: "pge_3",
    });
  });

  it("resumes after a document ID", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValue([]);

    const result = await backfillPartnerSearch({
      programId: "prog_test",
      after: "pge_100",
      searchProvider,
    });

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          programId: "prog_test",
          id: { gt: "pge_100" },
        },
      }),
    );
    expect(result).toEqual({
      processed: 0,
      lastDocumentId: "pge_100",
    });
  });

  it("requires a configured provider", async () => {
    await expect(
      backfillPartnerSearch({
        programId: "prog_test",
        searchProvider: null,
      }),
    ).rejects.toThrow("Partner search provider is not configured.");

    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
