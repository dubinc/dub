import { safeDecodeURIComponent } from "@dub/utils";
import { describe, expect, it } from "vitest";

describe("safeDecodeURIComponent", () => {
  it("decodes valid percent-encoding", () => {
    expect(safeDecodeURIComponent("hello%20world")).toBe("hello world");
  });

  it("returns the original string for malformed sequences", () => {
    expect(safeDecodeURIComponent("100%off")).toBe("100%off");
    expect(safeDecodeURIComponent("a%")).toBe("a%");
    expect(safeDecodeURIComponent("a%2")).toBe("a%2");
  });

  it("leaves plain and already-decoded keys unchanged", () => {
    expect(safeDecodeURIComponent("github")).toBe("github");
    expect(safeDecodeURIComponent("안녕")).toBe("안녕");
  });
});
