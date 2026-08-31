import type { PartnerSearchProvider } from "@/lib/api/partners/search";
import { findPartnerSearchCandidates } from "@/lib/api/partners/search";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { partner: { findUnique: mocks.findUnique } },
}));

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
    mocks.findUnique.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("answers a known email from the database, without calling the provider", async () => {
    mocks.findUnique.mockResolvedValue({ id: "pn_1" });
    const provider = createProvider();

    await expect(
      findPartnerSearchCandidates(provider, query("steven@dub.co")),
    ).resolves.toBeNull();

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { email: "steven@dub.co" },
      select: { id: true },
    });
    expect(provider.searchCandidates).not.toHaveBeenCalled();
  });

  it("falls back to the provider when no partner has that address", async () => {
    // `steven@dub.co` on the way to `steven@dub.com` is a complete address that
    // matches nothing, and n-grams still find the longer one.
    mocks.findUnique.mockResolvedValue(null);
    const provider = createProvider();

    await expect(
      findPartnerSearchCandidates(provider, query("steven@dub.co")),
    ).resolves.toEqual({ hits: [{ id: "pge_1" }] });

    expect(provider.searchCandidates).toHaveBeenCalledOnce();
  });

  it.each([
    ["half-typed", "steven@"],
    ["domain only", "@dub.co"],
    ["no dot in the domain", "steven@dub"],
    ["a name", "steven tey"],
  ])(
    "does not treat %s as an address, so the database is not queried",
    async (_label, search) => {
      const provider = createProvider();

      await findPartnerSearchCandidates(provider, query(search));

      expect(mocks.findUnique).not.toHaveBeenCalled();
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
