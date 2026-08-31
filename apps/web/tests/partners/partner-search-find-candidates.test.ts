import type { PartnerSearchProvider } from "@/lib/api/partners/search";
import { findPartnerSearchCandidates } from "@/lib/api/partners/search";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  linkFindUnique: vi.fn(),
  enrollmentFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    partner: { findUnique: mocks.findUnique },
    link: { findUnique: mocks.linkFindUnique },
    programEnrollment: { findUnique: mocks.enrollmentFindUnique },
  },
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
    mocks.linkFindUnique.mockReset();
    mocks.enrollmentFindUnique.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("pasted short links", () => {
    it.each([
      ["with protocol", "https://go.acme.com/partnername"],
      ["without protocol", "go.acme.com/partnername"],
    ])("resolves %s to exactly that enrollment", async (_label, search) => {
      mocks.linkFindUnique.mockResolvedValue({
        programId: "prog_1",
        partnerId: "pn_1",
      });
      mocks.enrollmentFindUnique.mockResolvedValue({ id: "pge_9" });
      const provider = createProvider();

      await expect(
        findPartnerSearchCandidates(provider, query(search)),
      ).resolves.toEqual({ hits: [{ id: "pge_9" }], exact: true });

      expect(mocks.linkFindUnique).toHaveBeenCalledWith({
        where: { shortLink: "https://go.acme.com/partnername" },
        select: { programId: true, partnerId: true },
      });
      expect(provider.searchCandidates).not.toHaveBeenCalled();
    });

    it("returns no hits for a link from another program", async () => {
      // Its domain tokens would only flood the ranked results.
      mocks.linkFindUnique.mockResolvedValue({
        programId: "prog_other",
        partnerId: "pn_1",
      });
      const provider = createProvider();

      await expect(
        findPartnerSearchCandidates(provider, query("go.acme.com/theirs")),
      ).resolves.toEqual({ hits: [], exact: true });

      expect(provider.searchCandidates).not.toHaveBeenCalled();
    });

    it("falls through to the ranked search on a miss", async () => {
      // A partial paste still matches the link key by prefix.
      mocks.linkFindUnique.mockResolvedValue(null);
      const provider = createProvider();

      await expect(
        findPartnerSearchCandidates(provider, query("go.acme.com/partnern")),
      ).resolves.toEqual({ hits: [{ id: "pge_1" }] });

      expect(provider.searchCandidates).toHaveBeenCalledOnce();
    });

    it.each([
      ["a bare domain", "go.acme.com"],
      ["a name", "drew moore"],
      ["a key alone", "partnername"],
    ])("does not treat %s as a short link", async (_label, search) => {
      const provider = createProvider();

      await findPartnerSearchCandidates(provider, query(search));

      expect(mocks.linkFindUnique).not.toHaveBeenCalled();
      expect(provider.searchCandidates).toHaveBeenCalledOnce();
    });
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
