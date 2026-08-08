import {
  deletePartnerSearchDocuments,
  partnerSearchDocumentSelect,
  type PartnerSearchDocumentSource,
  type PartnerSearchProvider,
  syncPartnerSearchDocuments,
  syncPartnerSearchDocumentsByPartnerIds,
  syncPartnerSearchDocumentsByProgramPartners,
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

describe("partner search document sync", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("does nothing when no provider is configured", async () => {
    await syncPartnerSearchDocuments(["pge_1"]);

    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("loads and upserts current documents", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValue([createSource("pge_1")]);

    await syncPartnerSearchDocuments(["pge_1", "pge_1"], {
      searchProvider,
    });

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["pge_1"] },
      },
      select: partnerSearchDocumentSelect,
    });
    expect(searchProvider.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "pge_1",
        programId: "prog_test",
        partnerId: "pn_pge_1",
        email: "partner@example.com",
      }),
    ]);
    expect(searchProvider.delete).not.toHaveBeenCalled();
  });

  it("deletes requested documents that no longer exist", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValue([createSource("pge_1")]);

    await syncPartnerSearchDocuments(["pge_1", "pge_missing"], {
      searchProvider,
    });

    expect(searchProvider.upsert).toHaveBeenCalledOnce();
    expect(searchProvider.delete).toHaveBeenCalledWith(["pge_missing"]);
  });

  it("upserts every enrollment for a partner", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValue([
      createSource("pge_1"),
      createSource("pge_2"),
    ]);

    await syncPartnerSearchDocumentsByPartnerIds(["pn_1", "pn_1"], {
      searchProvider,
    });

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        partnerId: { in: ["pn_1"] },
      },
      select: partnerSearchDocumentSelect,
      orderBy: { id: "asc" },
      take: 100,
    });
    expect(searchProvider.upsert).toHaveBeenCalledWith([
      expect.objectContaining({ id: "pge_1" }),
      expect.objectContaining({ id: "pge_2" }),
    ]);
  });

  it("upserts enrollments for program and partner pairs", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValue([createSource("pge_1")]);

    await syncPartnerSearchDocumentsByProgramPartners(
      [
        { programId: "prog_1", partnerId: "pn_1" },
        { programId: "prog_1", partnerId: "pn_1" },
        { programId: "prog_2", partnerId: "pn_2" },
      ],
      { searchProvider },
    );

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { programId: "prog_1", partnerId: "pn_1" },
          { programId: "prog_2", partnerId: "pn_2" },
        ],
      },
      select: partnerSearchDocumentSelect,
      orderBy: { id: "asc" },
      take: 100,
    });
    expect(searchProvider.upsert).toHaveBeenCalledWith([
      expect.objectContaining({ id: "pge_1" }),
    ]);
  });

  it("deletes document IDs without loading the database", async () => {
    const searchProvider = createProvider();

    await deletePartnerSearchDocuments(["pge_1", "pge_1", "pge_2"], {
      searchProvider,
    });

    expect(searchProvider.delete).toHaveBeenCalledWith(["pge_1", "pge_2"]);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("bounds document synchronization batches", async () => {
    const searchProvider = createProvider();
    const upsert = vi.mocked(searchProvider.upsert);
    const documentIds = Array.from(
      { length: 101 },
      (_, index) => `pge_${index + 1}`,
    );
    mocks.findMany.mockImplementation(({ where }) =>
      Promise.resolve(
        (where.id.in as string[]).map((id: string) => createSource(id)),
      ),
    );

    await syncPartnerSearchDocuments(documentIds, { searchProvider });

    expect(mocks.findMany).toHaveBeenCalledTimes(2);
    expect(mocks.findMany.mock.calls[0][0].where.id.in).toHaveLength(100);
    expect(mocks.findMany.mock.calls[1][0].where.id.in).toHaveLength(1);
    expect(searchProvider.upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0]).toHaveLength(100);
    expect(upsert.mock.calls[1][0]).toHaveLength(1);
  });

  it("paginates all enrollments matched by a partner batch", async () => {
    const searchProvider = createProvider();
    const upsert = vi.mocked(searchProvider.upsert);
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      createSource(`pge_${index + 1}`),
    );
    mocks.findMany
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([createSource("pge_101")]);

    await syncPartnerSearchDocumentsByPartnerIds(["pn_1"], {
      searchProvider,
    });

    expect(mocks.findMany).toHaveBeenNthCalledWith(2, {
      where: { partnerId: { in: ["pn_1"] } },
      select: partnerSearchDocumentSelect,
      orderBy: { id: "asc" },
      take: 100,
      cursor: { id: "pge_100" },
      skip: 1,
    });
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0]).toHaveLength(100);
    expect(upsert.mock.calls[1][0]).toHaveLength(1);
  });

  it("bounds provider delete batches", async () => {
    const searchProvider = createProvider();
    const deleteDocuments = vi.mocked(searchProvider.delete);
    const documentIds = Array.from(
      { length: 201 },
      (_, index) => `pge_${index + 1}`,
    );

    await deletePartnerSearchDocuments(documentIds, { searchProvider });

    expect(searchProvider.delete).toHaveBeenCalledTimes(3);
    expect(deleteDocuments.mock.calls[0][0]).toHaveLength(100);
    expect(deleteDocuments.mock.calls[1][0]).toHaveLength(100);
    expect(deleteDocuments.mock.calls[2][0]).toHaveLength(1);
  });

  it("propagates provider errors so the sync job can retry", async () => {
    const searchProvider = createProvider();
    vi.mocked(searchProvider.upsert).mockRejectedValue(
      new Error("Provider Connection Timeout"),
    );
    mocks.findMany.mockResolvedValue([createSource("pge_1")]);

    await expect(
      syncPartnerSearchDocuments(["pge_1"], { searchProvider }),
    ).rejects.toThrow("Provider Connection Timeout");
  });
});
