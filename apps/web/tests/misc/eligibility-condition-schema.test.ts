import { eligibilityConditionSchema } from "@/lib/zod/schemas/programs";
import { describe, expect, it } from "vitest";

describe("eligibilityConditionSchema — emailDomain normalization", () => {
  it("prepends @ when missing", () => {
    const result = eligibilityConditionSchema.parse({
      key: "emailDomain",
      operator: "is",
      value: ["domain.com"],
    });
    expect(result.value).toEqual(["@domain.com"]);
  });

  it("lowercases the domain", () => {
    const result = eligibilityConditionSchema.parse({
      key: "emailDomain",
      operator: "is",
      value: ["@ACME.COM"],
    });
    expect(result.value).toEqual(["@acme.com"]);
  });

  it("normalizes each entry in the array independently", () => {
    const result = eligibilityConditionSchema.parse({
      key: "emailDomain",
      operator: "is_not",
      value: ["ACME.COM", " @Sub.Acme.Com ", "@already.com"],
    });
    expect(result.value).toEqual([
      "@acme.com",
      "@sub.acme.com",
      "@already.com",
    ]);
  });

  it("preserves and lowercases wildcard patterns", () => {
    const result = eligibilityConditionSchema.parse({
      key: "emailDomain",
      operator: "is",
      value: ["@*.EDU", "*.Acme.Com"],
    });
    expect(result.value).toEqual(["@*.edu", "@*.acme.com"]);
  });
});

describe("eligibilityConditionSchema — country (no normalization)", () => {
  it("does not alter country codes", () => {
    const result = eligibilityConditionSchema.parse({
      key: "country",
      operator: "is",
      value: ["US", "CA"],
    });
    expect(result.value).toEqual(["US", "CA"]);
  });
});

describe("eligibilityConditionSchema — validation", () => {
  it("rejects an empty value array", () => {
    expect(() =>
      eligibilityConditionSchema.parse({
        key: "emailDomain",
        operator: "is",
        value: [],
      }),
    ).toThrow();
  });

  it("rejects a whitespace-only domain entry (normalizes to '@')", () => {
    expect(() =>
      eligibilityConditionSchema.parse({
        key: "emailDomain",
        operator: "is",
        value: ["   "],
      }),
    ).toThrow();
  });

  it("rejects an unknown key", () => {
    expect(() =>
      eligibilityConditionSchema.parse({
        key: "unknownKey",
        operator: "is",
        value: ["@acme.com"],
      }),
    ).toThrow();
  });
});
