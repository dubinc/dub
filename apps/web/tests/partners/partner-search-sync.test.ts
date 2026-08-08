import {
  deletePartnerSearchDocuments,
  partnerSearchDocumentSelect,
  PartnerSearchDocumentSource,
  PartnerSearchProvider,
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
});
