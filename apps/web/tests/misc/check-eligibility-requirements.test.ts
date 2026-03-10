import {
  partnerMeetsAllRequirements,
  partnerMeetsCondition,
} from "@/lib/partners/check-eligibility-requirements";
import { describe, expect, it } from "vitest";

describe("partnerMeetsCondition", () => {
  describe("country — is", () => {
    const condition = {
      key: "country" as const,
      operator: "is" as const,
      value: ["US", "CA"],
    };

    it("returns true when country is in the list", () => {
      expect(partnerMeetsCondition(condition, { country: "US" })).toBe(true);
    });

    it("returns false when country is not in the list", () => {
      expect(partnerMeetsCondition(condition, { country: "GB" })).toBe(false);
    });

    it("returns false when partner has no country or is null", () => {
      expect(partnerMeetsCondition(condition, { country: null })).toBe(false);
      expect(partnerMeetsCondition(condition, null)).toBe(false);
    });
  });

  describe("country — is_not", () => {
    const condition = {
      key: "country" as const,
      operator: "is_not" as const,
      value: ["US"],
    };

    it("returns false when country is in the exclusion list", () => {
      expect(partnerMeetsCondition(condition, { country: "US" })).toBe(false);
    });

    it("returns true when country is not in the exclusion list", () => {
      expect(partnerMeetsCondition(condition, { country: "GB" })).toBe(true);
    });
  });

  describe("emailDomain — is (exact match)", () => {
    const condition = {
      key: "emailDomain" as const,
      operator: "is" as const,
      value: ["@acme.com"],
    };

    it("returns true when domain matches exactly", () => {
      expect(
        partnerMeetsCondition(condition, { email: "jane@acme.com" }),
      ).toBe(true);
    });

    it("returns false for a subdomain — exact match is strict", () => {
      expect(
        partnerMeetsCondition(condition, { email: "jane@sub.acme.com" }),
      ).toBe(false);
    });

    it("returns false when domain contains the pattern as a suffix but is a different domain", () => {
      expect(
        partnerMeetsCondition(condition, { email: "jane@notacme.com" }),
      ).toBe(false);
    });
  });

  describe("emailDomain — is (wildcard)", () => {
    it("@*.edu matches any .edu email", () => {
      const condition = {
        key: "emailDomain" as const,
        operator: "is" as const,
        value: ["@*.edu"],
      };
      expect(
        partnerMeetsCondition(condition, { email: "jane@mit.edu" }),
      ).toBe(true);
      expect(
        partnerMeetsCondition(condition, { email: "jane@mit.edu.uk" }),
      ).toBe(false);
    });

    it("@*.acme.com matches subdomains but not the root domain", () => {
      const condition = {
        key: "emailDomain" as const,
        operator: "is" as const,
        value: ["@*.acme.com"],
      };
      expect(
        partnerMeetsCondition(condition, { email: "jane@mail.acme.com" }),
      ).toBe(true);
      expect(
        partnerMeetsCondition(condition, { email: "jane@acme.com" }),
      ).toBe(false);
    });
  });

  describe("emailDomain — is_not", () => {
    const condition = {
      key: "emailDomain" as const,
      operator: "is_not" as const,
      value: ["@gmail.com"],
    };

    it("returns false when domain matches, true when it does not", () => {
      expect(
        partnerMeetsCondition(condition, { email: "jane@gmail.com" }),
      ).toBe(false);
      expect(
        partnerMeetsCondition(condition, { email: "jane@acme.com" }),
      ).toBe(true);
    });
  });

  describe("emailDomain — missing or malformed data", () => {
    const condition = {
      key: "emailDomain" as const,
      operator: "is" as const,
      value: ["@acme.com"],
    };

    it("returns false when partner has no email", () => {
      expect(partnerMeetsCondition(condition, { email: null })).toBe(false);
    });

    it("returns false when email has no @ sign", () => {
      expect(
        partnerMeetsCondition(condition, { email: "notanemail" }),
      ).toBe(false);
    });
  });

  describe("case insensitivity", () => {
    it("matches uppercase email domain against a lowercase pattern", () => {
      const condition = {
        key: "emailDomain" as const,
        operator: "is" as const,
        value: ["@acme.com"],
      };
      expect(
        partnerMeetsCondition(condition, { email: "JANE@ACME.COM" }),
      ).toBe(true);
    });
  });
});

describe("partnerMeetsAllRequirements", () => {
  const countryCondition = {
    key: "country" as const,
    operator: "is" as const,
    value: ["US"],
  };
  const emailCondition = {
    key: "emailDomain" as const,
    operator: "is" as const,
    value: ["@acme.com"],
  };

  it("returns true when all conditions are met", () => {
    expect(
      partnerMeetsAllRequirements([countryCondition, emailCondition], {
        country: "US",
        email: "jane@acme.com",
      }),
    ).toBe(true);
  });

  it("returns false when one condition is unmet", () => {
    expect(
      partnerMeetsAllRequirements([countryCondition, emailCondition], {
        country: "GB",
        email: "jane@acme.com",
      }),
    ).toBe(false);
  });

  it("returns true when requirements array is empty", () => {
    expect(
      partnerMeetsAllRequirements([], { country: "US", email: "jane@acme.com" }),
    ).toBe(true);
  });
});
