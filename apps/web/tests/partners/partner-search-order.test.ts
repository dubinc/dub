import { orderByPartnerSearchHits } from "@/lib/api/partners/search";
import { describe, expect, it } from "vitest";

describe("orderByPartnerSearchHits", () => {
  it("restores provider order and ignores missing records", () => {
    const records = [
      { id: "pge_1", name: "First" },
      { id: "pge_2", name: "Second" },
    ];
    const hits = [
      { id: "pge_2", partnerId: "pn_2" },
      { id: "pge_missing", partnerId: "pn_missing" },
      { id: "pge_1", partnerId: "pn_1" },
    ];

    expect(orderByPartnerSearchHits(records, hits)).toEqual([
      { id: "pge_2", name: "Second" },
      { id: "pge_1", name: "First" },
    ]);
  });
});
