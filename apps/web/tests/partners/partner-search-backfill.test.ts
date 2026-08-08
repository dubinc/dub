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
  const timestamp = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    programId: "prog_test",
    partnerId: `pn_${id}`,
    status: "approved",
    tenantId: null,
    groupId: null,
    totalClicks: 0,
    totalLeads: 0,
    totalConversions: 0,
    totalSaleAmount: BigInt(0),
    totalCommissions: BigInt(0),
    netRevenue: BigInt(0),
    earningsPerClick: 0,
    averageLifetimeValue: null,
    clickToLeadRate: null,
    clickToConversionRate: null,
    leadToConversionRate: null,
    returnOnAdSpend: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    partner: {
      name: "Rafi Hasan",
      email: "partner@example.com",
      companyName: "Dub Partners",
      description: "Developer tools educator",
      country: "CA",
      updatedAt: timestamp,
      platforms: [],
    },
    links: [],
    programPartnerTags: [],
    applicationEvent: null,
  };
}

function createProvider(): PartnerSearchProvider {
  return {
    search: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
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
      }),
    ).rejects.toThrow("Partner search provider is not configured.");

    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
