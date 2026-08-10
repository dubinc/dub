import type { PartnerSearchProvider } from "@/lib/api/partners/search";
import { reconcilePartnerSearchIndex } from "@/lib/api/partners/search";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  sanitizeFullTextSearch: (value: string) => value,
  prisma: {
    programEnrollment: { findMany: mocks.findMany },
  },
}));

function createProvider(
  pages: { documentIds: string[]; cursor: string | null }[],
): PartnerSearchProvider {
  const listDocumentIds = vi.fn();
  for (const page of pages) {
    listDocumentIds.mockResolvedValueOnce(page);
  }

  return {
    searchCandidates: vi.fn(),
    waitForIndexing: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    listDocumentIds,
  };
}

/** Only the enrollment IDs listed here still exist in the database. */
function withLiveEnrollments(liveIds: string[]) {
  mocks.findMany.mockImplementation(async ({ where }) =>
    where.id.in
      .filter((id: string) => liveIds.includes(id))
      .map((id: string) => ({ id })),
  );
}

describe("reconcilePartnerSearchIndex", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("deletes documents whose enrollment no longer exists", async () => {
    const provider = createProvider([
      { documentIds: ["pge_live", "pge_orphan"], cursor: null },
    ]);
    withLiveEnrollments(["pge_live"]);

    const result = await reconcilePartnerSearchIndex({
      searchProvider: provider,
    });

    expect(provider.delete).toHaveBeenCalledWith(["pge_orphan"]);
    expect(result).toEqual({ scanned: 2, deleted: 1 });
  });

  it("leaves a fully consistent index untouched", async () => {
    const provider = createProvider([
      { documentIds: ["pge_a", "pge_b"], cursor: null },
    ]);
    withLiveEnrollments(["pge_a", "pge_b"]);

    const result = await reconcilePartnerSearchIndex({
      searchProvider: provider,
    });

    expect(provider.delete).not.toHaveBeenCalled();
    expect(result).toEqual({ scanned: 2, deleted: 0 });
  });

  it("keeps paging through empty pages until the cursor is null", async () => {
    // Not contrived: Redis SCAN returns these, and stopping on the first one
    // would skip the rest of the index.
    const provider = createProvider([
      { documentIds: [], cursor: "17" },
      { documentIds: ["pge_orphan"], cursor: "42" },
      { documentIds: [], cursor: null },
    ]);
    withLiveEnrollments([]);

    const result = await reconcilePartnerSearchIndex({
      searchProvider: provider,
      pageSize: 2,
    });

    expect(provider.listDocumentIds).toHaveBeenCalledTimes(3);
    expect(provider.listDocumentIds).toHaveBeenNthCalledWith(1, {
      cursor: undefined,
      limit: 2,
    });
    expect(provider.listDocumentIds).toHaveBeenNthCalledWith(2, {
      cursor: "17",
      limit: 2,
    });
    expect(result).toEqual({ scanned: 1, deleted: 1 });
  });

  it("does not query the database for an empty page", async () => {
    const provider = createProvider([{ documentIds: [], cursor: null }]);

    await reconcilePartnerSearchIndex({ searchProvider: provider });

    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(provider.delete).not.toHaveBeenCalled();
  });

  it("reports progress per page", async () => {
    const provider = createProvider([
      { documentIds: ["pge_orphan"], cursor: "9" },
      { documentIds: ["pge_live"], cursor: null },
    ]);
    withLiveEnrollments(["pge_live"]);
    const onProgress = vi.fn();

    await reconcilePartnerSearchIndex({ searchProvider: provider, onProgress });

    expect(onProgress).toHaveBeenNthCalledWith(1, {
      scanned: 1,
      deleted: 1,
      cursor: "9",
    });
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      scanned: 2,
      deleted: 1,
      cursor: null,
    });
  });

  it("requires a configured provider", async () => {
    await expect(
      reconcilePartnerSearchIndex({ searchProvider: null }),
    ).rejects.toThrow("Partner search provider is not configured.");
  });

  it("rejects a non-positive page size", async () => {
    await expect(
      reconcilePartnerSearchIndex({
        searchProvider: createProvider([]),
        pageSize: 0,
      }),
    ).rejects.toThrow("Page size must be a positive integer.");
  });
});
