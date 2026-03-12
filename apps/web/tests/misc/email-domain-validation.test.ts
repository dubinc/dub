import { isValidDomainPattern } from "@/lib/partners/evaluate-application-requirements";
import { describe, expect, it } from "vitest";

describe("isValidDomainPattern", () => {
  it.each([
    ["@acme.com", "simple domain"],
    ["@sub.acme.com", "subdomain"],
    ["@acme.co.uk", "multi-part TLD"],
    ["@*.edu", "wildcard with TLD only"],
    ["@*.acme.com", "wildcard with domain + TLD"],
  ])("valid: %s — %s", (pattern) => {
    expect(isValidDomainPattern(pattern)).toBe(true);
  });

  it.each([
    ["acme.com", "missing @ prefix"],
    ["@acme", "no TLD"],
    ["@acme.*", "wildcard at end, not start"],
    ["@*.", "wildcard with no TLD"],
    ["", "empty string"],
    ["@*.c", "TLD too short (1 char)"],
  ])("invalid: %s — %s", (pattern) => {
    expect(isValidDomainPattern(pattern)).toBe(false);
  });

  it("trims leading/trailing whitespace before validating", () => {
    expect(isValidDomainPattern("  @acme.com  ")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isValidDomainPattern("@ACME.COM")).toBe(true);
  });
});
