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

  it("sends a complete email to the database path, without calling the provider", async () => {
    // The database matches the address exactly, so an address that matches no
    // partner returns no rows instead of fuzzy matches from the provider.
    const provider = createProvider();

    await expect(
      findPartnerSearchCandidates(provider, query("steven@dub.co")),
    ).resolves.toBeNull();

    expect(provider.searchCandidates).not.toHaveBeenCalled();
  });

  it.each([
    ["half-typed", "steven@"],
    ["domain only", "@dub.co"],
    ["no dot in the domain", "steven@dub"],
    ["a name", "steven tey"],
  ])(
    "does not treat %s as an address, so the provider is queried",
    async (_label, search) => {
      const provider = createProvider();

      await findPartnerSearchCandidates(provider, query(search));

      expect(provider.searchCandidates).toHaveBeenCalledOnce();
    },
  );

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
