import { eligibilityConditionSchema } from "@/lib/zod/schemas/programs";
import { describe, expect, it } from "vitest";

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

describe("eligibilityConditionSchema — identity verification", () => {
  it("accepts the identity verification requirement payload", () => {
    const result = eligibilityConditionSchema.parse({
      key: "identityVerificationStatus",
      operator: "is",
      value: "approved",
    });
    expect(result).toEqual({
      key: "identityVerificationStatus",
      operator: "is",
      value: "approved",
    });
  });
});

describe("eligibilityConditionSchema — validation", () => {
  it("rejects an empty country value array", () => {
    expect(() =>
      eligibilityConditionSchema.parse({
        key: "country",
        operator: "is",
        value: [],
      }),
    ).toThrow();
  });

  it("rejects invalid identity verification value", () => {
    expect(() =>
      eligibilityConditionSchema.parse({
        key: "identityVerificationStatus",
        operator: "is",
        value: "submitted",
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
