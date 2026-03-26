import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import { describe, expect, it } from "vitest";

function evaluate(
  applicationRequirements: unknown,
  context: {
    country?: string | null;
    email?: string | null;
    identityVerificationStatus?: string | null;
  },
) {
  return evaluateApplicationRequirements({ applicationRequirements, context });
}

describe("evaluateApplicationRequirements", () => {
  describe("country — is", () => {
    const condition = {
      key: "country" as const,
      operator: "is" as const,
      value: ["US", "CA"],
    };

    it("returns valid when country is in the list", () => {
      const result = evaluate([condition], { country: "US" });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("requirementsMet");
    });

    it("returns invalid when country is not in the list", () => {
      const result = evaluate([condition], { country: "GB" });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });

    it("returns invalid when context has no country or is null", () => {
      const resultNull = evaluate([condition], { country: null });
      expect(resultNull.valid).toBe(false);
      expect(resultNull.reason).toBe("requirementsNotMet");

      const resultEmpty = evaluate([condition], {});
      expect(resultEmpty.valid).toBe(false);
      expect(resultEmpty.reason).toBe("requirementsNotMet");
    });
  });

  describe("country — is_not", () => {
    const condition = {
      key: "country" as const,
      operator: "is_not" as const,
      value: ["US"],
    };

    it("returns invalid when country is in the exclusion list", () => {
      const result = evaluate([condition], { country: "US" });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });

    it("returns valid when country is not in the exclusion list", () => {
      const result = evaluate([condition], { country: "GB" });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("requirementsMet");
    });
  });

  describe("emailDomain — is (exact match)", () => {
    const condition = {
      key: "emailDomain" as const,
      operator: "is" as const,
      value: ["@acme.com"],
    };

    it("returns valid when domain matches exactly", () => {
      const result = evaluate([condition], { email: "jane@acme.com" });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("requirementsMet");
    });

    it("returns invalid for a subdomain — exact match is strict", () => {
      const result = evaluate([condition], { email: "jane@sub.acme.com" });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });

    it("returns invalid when domain contains the pattern as a suffix but is a different domain", () => {
      const result = evaluate([condition], { email: "jane@notacme.com" });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });
  });

  describe("emailDomain — is (wildcard)", () => {
    it("@*.edu matches any .edu email", () => {
      const condition = {
        key: "emailDomain" as const,
        operator: "is" as const,
        value: ["@*.edu"],
      };
      const resultMatch = evaluate([condition], { email: "jane@mit.edu" });
      expect(resultMatch.valid).toBe(true);
      expect(resultMatch.reason).toBe("requirementsMet");

      const resultNoMatch = evaluate([condition], { email: "jane@mit.edu.uk" });
      expect(resultNoMatch.valid).toBe(false);
      expect(resultNoMatch.reason).toBe("requirementsNotMet");
    });

    it("@*.acme.com matches subdomains but not the root domain", () => {
      const condition = {
        key: "emailDomain" as const,
        operator: "is" as const,
        value: ["@*.acme.com"],
      };
      const resultMatch = evaluate([condition], {
        email: "jane@mail.acme.com",
      });
      expect(resultMatch.valid).toBe(true);
      expect(resultMatch.reason).toBe("requirementsMet");

      const resultNoMatch = evaluate([condition], { email: "jane@acme.com" });
      expect(resultNoMatch.valid).toBe(false);
      expect(resultNoMatch.reason).toBe("requirementsNotMet");
    });
  });

  describe("emailDomain — is_not", () => {
    const condition = {
      key: "emailDomain" as const,
      operator: "is_not" as const,
      value: ["@gmail.com"],
    };

    it("returns invalid when domain matches, valid when it does not", () => {
      const resultMatch = evaluate([condition], { email: "jane@gmail.com" });
      expect(resultMatch.valid).toBe(false);
      expect(resultMatch.reason).toBe("requirementsNotMet");

      const resultNoMatch = evaluate([condition], { email: "jane@acme.com" });
      expect(resultNoMatch.valid).toBe(true);
      expect(resultNoMatch.reason).toBe("requirementsMet");
    });
  });

  describe("emailDomain — missing or malformed data", () => {
    const condition = {
      key: "emailDomain" as const,
      operator: "is" as const,
      value: ["@acme.com"],
    };

    it("returns invalid when context has no email", () => {
      const result = evaluate([condition], { email: null });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });

    it("returns invalid when email has no @ sign", () => {
      const result = evaluate([condition], { email: "notanemail" });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });
  });

  describe("case insensitivity", () => {
    it("matches uppercase email domain against a lowercase pattern", () => {
      const condition = {
        key: "emailDomain" as const,
        operator: "is" as const,
        value: ["@acme.com"],
      };
      const result = evaluate([condition], { email: "JANE@ACME.COM" });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("requirementsMet");
    });
  });

  describe("multiple requirements (all must be met)", () => {
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
    const requirements = [countryCondition, emailCondition];

    it("returns valid when all conditions are met", () => {
      const result = evaluate(requirements, {
        country: "US",
        email: "jane@acme.com",
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("requirementsMet");
    });

    it("returns invalid when one condition is unmet", () => {
      const result = evaluate(requirements, {
        country: "GB",
        email: "jane@acme.com",
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });
  });

  describe("no requirements", () => {
    it("returns valid when requirements array is empty", () => {
      const result = evaluate([], {
        country: "US",
        email: "jane@acme.com",
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("noRequirements");
    });

    it("returns valid when applicationRequirements is null", () => {
      const result = evaluate(null, {
        country: "US",
        email: "jane@acme.com",
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("noRequirements");
    });

    it("returns valid when applicationRequirements is undefined", () => {
      const result = evaluate(undefined, {
        country: "US",
        email: "jane@acme.com",
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("noRequirements");
    });
  });

  describe("identityVerification", () => {
    const condition = {
      key: "identityVerification" as const,
      operator: "is" as const,
      value: ["required"],
    };

    it("returns valid when identityVerificationStatus is approved", () => {
      const result = evaluate([condition], {
        identityVerificationStatus: "approved",
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("requirementsMet");
    });

    it("returns invalid when identityVerificationStatus is not approved", () => {
      for (const status of [
        "started",
        "submitted",
        "declined",
        "expired",
        "abandoned",
        "review",
        "resubmissionRequested",
      ]) {
        const result = evaluate([condition], {
          identityVerificationStatus: status,
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("requirementsNotMet");
      }
    });

    it("returns invalid when identityVerificationStatus is null or undefined", () => {
      const resultNull = evaluate([condition], {
        identityVerificationStatus: null,
      });
      expect(resultNull.valid).toBe(false);
      expect(resultNull.reason).toBe("requirementsNotMet");

      const resultUndefined = evaluate([condition], {});
      expect(resultUndefined.valid).toBe(false);
      expect(resultUndefined.reason).toBe("requirementsNotMet");
    });
  });

  describe("combined country + identityVerification", () => {
    const conditions = [
      {
        key: "country" as const,
        operator: "is" as const,
        value: ["US"],
      },
      {
        key: "identityVerification" as const,
        operator: "is" as const,
        value: ["required"],
      },
    ];

    it("returns valid when both conditions are met", () => {
      const result = evaluate(conditions, {
        country: "US",
        identityVerificationStatus: "approved",
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("requirementsMet");
    });

    it("returns invalid when only country is met", () => {
      const result = evaluate(conditions, {
        country: "US",
        identityVerificationStatus: "submitted",
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });

    it("returns invalid when only identity verification is met", () => {
      const result = evaluate(conditions, {
        country: "GB",
        identityVerificationStatus: "approved",
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });
  });

  describe("invalid requirements", () => {
    it("returns invalid with reason invalidRequirements when schema parsing fails", () => {
      const result = evaluate([{ key: "country", operator: "is", value: [] }], {
        country: "US",
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("invalidRequirements");
    });
  });
});
