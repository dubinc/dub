import { getPartnersCount } from "@/lib/api/partners/get-partners-count";
import { PartnerSearchProvider } from "@/lib/api/partners/search";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

function createSearchProvider(): PartnerSearchProvider {
  return {
    search: vi.fn(),
    count: vi.fn().mockResolvedValue(2),
    groupBy: vi.fn().mockResolvedValue([{ value: "approved", count: 2 }]),
    upsert: vi.fn(),
    delete: vi.fn(),
  };
}

describe("getPartnersCount search", () => {
  it("uses the provider for an absolute searched count", async () => {
    const searchProvider = createSearchProvider();

    const count = await getPartnersCount<number>(
      { programId: "prog_test", search: "examp" },
      { searchProvider },
    );

    expect(count).toBe(2);
    expect(searchProvider.count).toHaveBeenCalledWith(
      expect.objectContaining({
        programId: "prog_test",
        query: "examp",
      }),
    );
  });

  it("uses the provider for grouped searched counts", async () => {
    const searchProvider = createSearchProvider();

    const groups = await getPartnersCount<{ status: string; _count: number }[]>(
      { programId: "prog_test", search: "examp", groupBy: "status" },
      { searchProvider },
    );

    expect(searchProvider.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ query: "examp" }),
      "status",
    );
    expect(groups).toEqual(
      expect.arrayContaining([
        { status: "approved", _count: 2 },
        { status: "pending", _count: 0 },
      ]),
    );
  });
});
