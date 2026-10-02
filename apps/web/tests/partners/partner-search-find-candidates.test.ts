import type { PartnerSearchProvider } from "@/lib/api/partners/search";
import { findPartnerSearchCandidates } from "@/lib/api/partners/search";
import { beforeEach, describe, expect, it, vi } from "vitest";

function createProvider(
  searchCandidates = vi.fn().mockResolvedValue({ hits: [{ id: "pge_1" }] }),
) {
  return {
    searchCandidates,
    countCandidates: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  } as unknown as PartnerSearchProvider & {
    searchCandidates: typeof searchCandidates;
  };
}

const query = (search: string) => ({
  programId: "prog_1",
  query: search,
  limit: 10,
});

describe("findPartnerSearchCandidates", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns the provider's candidates", async () => {
    const provider = createProvider();

    await expect(
      findPartnerSearchCandidates(provider, query("steven")),
    ).resolves.toEqual({ hits: [{ id: "pge_1" }] });
  });

  it("degrades to the database search path when the provider throws", async () => {
    const provider = createProvider(
      vi.fn().mockRejectedValue(new Error("down")),
    );

    await expect(
      findPartnerSearchCandidates(provider, query("steven")),
    ).resolves.toBeNull();
  });

  it("surfaces provider failures when the caller opts in", async () => {
    const provider = createProvider(
      vi.fn().mockRejectedValue(new Error("down")),
    );

    await expect(
      findPartnerSearchCandidates(provider, query("steven"), {
        throwOnError: true,
      }),
    ).rejects.toThrow("down");
  });
});
