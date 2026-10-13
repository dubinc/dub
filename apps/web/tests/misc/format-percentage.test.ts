import { formatPercentage } from "@dub/utils";
import { describe, expect, it } from "vitest";

describe("formatPercentage", () => {
  it("rounds to the given decimals and drops trailing zeros", () => {
    expect(formatPercentage(45.25)).toBe("45.25");
    expect(formatPercentage(45.25, { digits: 1 })).toBe("45.3");
    expect(formatPercentage(28)).toBe("28");
    expect(formatPercentage(100)).toBe("100");
  });

  it("shows a value too small to round as less than the smallest step", () => {
    expect(formatPercentage(0.004)).toBe("< 0.01");
    expect(formatPercentage(0.04, { digits: 1 })).toBe("< 0.1");
  });

  it("shows zero as 0", () => {
    expect(formatPercentage(0)).toBe("0");
  });
});
