import { createId } from "@/lib/api/create-id";
import { describe, expect, it } from "vitest";

describe("createId", () => {
  it("should create ids in lexicographical order", () => {
    const ids: string[] = [];

    for (let i = 0; i < 10; i++) {
      ids.push(createId({}));

      const now = Date.now();
      while (Date.now() - now < 10) {} // busy wait for 10ms
    }

    // Create a copy and sort it lexicographically
    const sortedIds = [...ids].sort();
    expect(ids).toEqual(sortedIds);
  });

  it("should maintain order with prefixes", () => {
    const ids: string[] = [];

    for (let i = 0; i < 5; i++) {
      ids.push(createId({ prefix: "link_" }));

      const now = Date.now();
      while (Date.now() - now < 10) {} // busy wait for 10ms
    }

    const sortedIds = [...ids].sort();
    expect(ids).toEqual(sortedIds);
  });
});
