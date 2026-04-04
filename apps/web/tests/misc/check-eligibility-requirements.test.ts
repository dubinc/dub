import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import { IdentityVerificationStatus } from "@dub/prisma/client";
import { describe, expect, it } from "vitest";

function evaluate(
  applicationRequirements: unknown,
  context: {
    country?: string | null;
    identityVerificationStatus?: IdentityVerificationStatus | null;
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

  describe("multiple requirements (all must be met)", () => {
    const countryCondition = {
      key: "country" as const,
      operator: "is" as const,
      value: ["US"],
    };
    const identityCondition = {
      key: "identityVerificationStatus" as const,
      operator: "is" as const,
      value: "approved" as const,
    };
    const requirements = [countryCondition, identityCondition];

    it("returns valid when all conditions are met", () => {
      const result = evaluate(requirements, {
        country: "US",
        identityVerificationStatus: "approved",
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("requirementsMet");
    });

    it("returns invalid when one condition is unmet", () => {
      const result = evaluate(requirements, {
        country: "GB",
        identityVerificationStatus: "approved",
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });
  });

  describe("no requirements", () => {
    it("returns valid when requirements array is empty", () => {
      const result = evaluate([], {
        country: "US",
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("noRequirements");
    });

    it("returns valid when applicationRequirements is null", () => {
      const result = evaluate(null, {
        country: "US",
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("noRequirements");
    });

    it("returns valid when applicationRequirements is undefined", () => {
      const result = evaluate(undefined, {
        country: "US",
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("noRequirements");
    });
  });

  describe("identityVerificationStatus", () => {
    const condition = {
      key: "identityVerificationStatus" as const,
      operator: "is" as const,
      value: "approved" as const,
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
      ] as const) {
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

  describe("combined country + identityVerificationStatus", () => {
    const conditions = [
      {
        key: "country" as const,
        operator: "is" as const,
        value: ["US"],
      },
      {
        key: "identityVerificationStatus" as const,
        operator: "is" as const,
        value: "approved" as const,
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
