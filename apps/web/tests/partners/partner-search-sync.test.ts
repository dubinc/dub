import {
  partnerSearchDocumentSelect,
  syncPartnerEnrollments,
  syncPartnerSearchDocuments,
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

function createSource(
  id: string,
  overrides: Partial<PartnerSearchDocumentSource> = {},
): PartnerSearchDocumentSource {
  return {
    id,
    programId: "prog_test",
    partnerId: `pn_${id}`,
    status: "approved" as const,
    groupId: null,
    partner: {
      name: "Rafi Hasan",
      email: "partner@example.com",
      companyName: "Dub Partners",
      description: "Developer tools educator",
      country: null,
      programPartnerTags: [],
      platforms: [],
    },
    links: [],
    ...overrides,
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

describe("syncPartnerSearchDocuments", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("upserts the enrollments the database still has", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([
      createSource("pge_1"),
      createSource("pge_2"),
    ]);

    const result = await syncPartnerSearchDocuments({
      enrollmentIds: ["pge_1", "pge_2"],
      searchProvider,
    });

    expect(result).toEqual({ upserted: 2, deleted: 0 });
    expect(searchProvider.delete).not.toHaveBeenCalled();
    expect(searchProvider.upsert).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(searchProvider.upsert).mock.calls[0][0].map(({ id }) => id),
    ).toEqual(["pge_1", "pge_2"]);
  });

  it("deletes the enrollments the database no longer has", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([createSource("pge_1")]);

    const result = await syncPartnerSearchDocuments({
      enrollmentIds: ["pge_1", "pge_deleted"],
      searchProvider,
    });

    expect(result).toEqual({ upserted: 1, deleted: 1 });
    expect(searchProvider.delete).toHaveBeenCalledWith(["pge_deleted"]);
  });

  it("deletes without upserting when every enrollment is gone", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([]);

    const result = await syncPartnerSearchDocuments({
      enrollmentIds: ["pge_gone"],
      searchProvider,
    });

    expect(result).toEqual({ upserted: 0, deleted: 1 });
    expect(searchProvider.upsert).not.toHaveBeenCalled();
    expect(searchProvider.delete).toHaveBeenCalledWith(["pge_gone"]);
  });

  it("deduplicates the requested ids so one enrollment is written once", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([createSource("pge_1")]);

    await syncPartnerSearchDocuments({
      enrollmentIds: ["pge_1", "pge_1", "pge_1"],
      searchProvider,
    });

    expect(mocks.findMany.mock.calls[0][0].where.id.in).toEqual(["pge_1"]);
    expect(vi.mocked(searchProvider.upsert).mock.calls[0][0]).toHaveLength(1);
  });

  it("does not touch the database when no provider is configured", async () => {
    const result = await syncPartnerSearchDocuments({
      enrollmentIds: ["pge_1"],
      searchProvider: null,
    });

    expect(result).toEqual({ upserted: 0, deleted: 0 });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("does not touch the database when there is nothing to sync", async () => {
    const searchProvider = createProvider();

    const result = await syncPartnerSearchDocuments({
      enrollmentIds: [],
      searchProvider,
    });

    expect(result).toEqual({ upserted: 0, deleted: 0 });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("serializes the document the index stores", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([
      createSource("pge_1", {
        partner: {
          name: "Rafi Hasan",
          email: "rafi@example.com",
          companyName: null,
          description: null,
          country: "US",
          // Tags from another program must not leak into this document.
          programPartnerTags: [
            { programId: "prog_test", partnerTagId: "ptag_1" },
            { programId: "prog_other", partnerTagId: "ptag_other" },
          ],
          platforms: [{ type: "youtube" as const, identifier: "rafi" }],
        },
      }),
    ]);

    await syncPartnerSearchDocuments({
      enrollmentIds: ["pge_1"],
      searchProvider,
    });

    expect(vi.mocked(searchProvider.upsert).mock.calls[0][0][0]).toMatchObject({
      id: "pge_1",
      country: "US",
      partnerTagIds: ["ptag_1"],
      platformIdentifiers: ["rafi"],
    });
  });
});

describe("syncPartnerEnrollments", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("reads and upserts one page of documents in a single query", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([
      createSource("pge_1"),
      createSource("pge_2"),
    ]);

    const result = await syncPartnerEnrollments({
      partnerIds: ["pn_1"],
      searchProvider,
    });

    expect(result).toEqual({ upserted: 2, lastEnrollmentId: "pge_2" });
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany.mock.calls[0][0]).toMatchObject({
      where: { partnerId: { in: ["pn_1"] } },
      select: partnerSearchDocumentSelect,
      orderBy: { id: "asc" },
    });
    expect(
      vi.mocked(searchProvider.upsert).mock.calls[0][0].map(({ id }) => id),
    ).toEqual(["pge_1", "pge_2"]);
    expect(searchProvider.delete).not.toHaveBeenCalled();
  });

  it("narrows to a single program when one is given", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([createSource("pge_1")]);

    await syncPartnerEnrollments({
      partnerIds: ["pn_1"],
      programId: "prog_test",
      searchProvider,
    });

    expect(mocks.findMany.mock.calls[0][0].where).toEqual({
      partnerId: { in: ["pn_1"] },
      programId: "prog_test",
    });
  });

  it("pages past the cursor so a large fan-out can resume", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([createSource("pge_3")]);

    await syncPartnerEnrollments({
      partnerIds: ["pn_1"],
      after: "pge_2",
      take: 2,
      searchProvider,
    });

    const { where, take } = mocks.findMany.mock.calls[0][0];
    expect(where).toEqual({
      partnerId: { in: ["pn_1"] },
      id: { gt: "pge_2" },
    });
    expect(take).toBe(2);
  });

  it("does not write when the page is empty", async () => {
    const searchProvider = createProvider();
    mocks.findMany.mockResolvedValueOnce([]);

    const result = await syncPartnerEnrollments({
      partnerIds: ["pn_1"],
      searchProvider,
    });

    expect(result).toEqual({ upserted: 0, lastEnrollmentId: null });
    expect(searchProvider.upsert).not.toHaveBeenCalled();
  });

  it("does not query when there are no partners", async () => {
    const searchProvider = createProvider();

    const result = await syncPartnerEnrollments({
      partnerIds: [],
      searchProvider,
    });

    expect(result).toEqual({ upserted: 0, lastEnrollmentId: null });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
