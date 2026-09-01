import { resolvePartnerSearchCandidateQuery } from "@/lib/api/partners/search";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { program: { findUnique: mocks.findUnique } },
}));

const input = (search: string) => ({
  programId: "prog_test",
  search,
  page: 1,
  pageSize: 25,
  sortBy: "totalSaleAmount" as const,
  sortOrder: "desc" as const,
});

describe("resolvePartnerSearchCandidateQuery", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
  });

  it("reduces a link on the program domain to its key", async () => {
    mocks.findUnique.mockResolvedValue({ domain: "go.acme.com" });

    const query = await resolvePartnerSearchCandidateQuery(
      input("https://go.acme.com/partner"),
    );

    expect(query?.query).toBe("partner");
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "prog_test" },
      select: { domain: true },
    });
  });

  it("keeps a link on another domain", async () => {
    mocks.findUnique.mockResolvedValue({ domain: "go.acme.com" });

    const query = await resolvePartnerSearchCandidateQuery(
      input("dub.sh/partner"),
    );

    expect(query?.query).toBe("dub.sh/partner");
  });

  it("does not look the program up for a plain query", async () => {
    const query = await resolvePartnerSearchCandidateQuery(input("steven"));

    expect(query?.query).toBe("steven");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when there is no candidate query", async () => {
    await expect(resolvePartnerSearchCandidateQuery(input(""))).resolves.toBe(
      null,
    );
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
