import {
  EligibilityContext,
  evaluateApplicationRequirements,
  getEligibilityContext,
  isCountryConditionMet,
  isProfileAttributeMet,
} from "@/lib/partners/evaluate-application-requirements";
import { describe, expect, it } from "vitest";

function evaluate(
  applicationRequirements: unknown,
  context: EligibilityContext,
) {
  return evaluateApplicationRequirements({ applicationRequirements, context });
}

const fullProfile = {
  hasVerifiedWebsite: true,
  hasVerifiedSocialAccount: true,
  hasProgramBans: false,
};

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

  describe("invalid requirements", () => {
    it("returns invalid with reason invalidRequirements when schema parsing fails", () => {
      const result = evaluate([{ key: "country", operator: "is", value: [] }], {
        country: "US",
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("invalidRequirements");
    });

    it("rejects an invalid operator for a profile condition", () => {
      const result = evaluate(
        [{ key: "profile", operator: "is", value: ["verified_website"] }],
        { profile: fullProfile },
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("invalidRequirements");
    });

    it("rejects unknown profile attributes", () => {
      const result = evaluate(
        [{ key: "profile", operator: "has", value: ["not_a_real_attribute"] }],
        { profile: fullProfile },
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("invalidRequirements");
    });

    it("rejects the removed account condition key", () => {
      const result = evaluate(
        [{ key: "account", operator: "is", value: ["no_program_bans"] }],
        { profile: fullProfile },
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("invalidRequirements");
    });

    it("rejects duplicate condition keys", () => {
      const result = evaluate(
        [
          { key: "country", operator: "is", value: ["US"] },
          { key: "country", operator: "is", value: ["CA"] },
        ],
        { country: "US" },
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("invalidRequirements");
    });
  });

  describe("profile — has", () => {
    const condition = {
      key: "profile" as const,
      operator: "has" as const,
      value: ["verified_website", "no_program_bans"],
    };

    it("returns valid when all selected attributes are met", () => {
      const result = evaluate([condition], { profile: fullProfile });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("requirementsMet");
    });

    it("returns invalid when any selected attribute is unmet", () => {
      const result = evaluate([condition], {
        profile: { ...fullProfile, hasVerifiedWebsite: false },
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });

    it("returns invalid when banned from a program", () => {
      const result = evaluate([condition], {
        profile: { ...fullProfile, hasProgramBans: true },
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });

    it("ignores unmet attributes that are not selected", () => {
      const result = evaluate([condition], {
        profile: { ...fullProfile, hasVerifiedSocialAccount: false },
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("requirementsMet");
    });

    it("returns invalid when context has no profile data", () => {
      const result = evaluate([condition], {});
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });
  });

  describe("per-attribute checks (used by the eligibility card)", () => {
    it("isProfileAttributeMet checks the selected attribute only", () => {
      const profile = { ...fullProfile, hasVerifiedWebsite: false };
      expect(isProfileAttributeMet(profile, "verified_website")).toBe(false);
      expect(isProfileAttributeMet(profile, "verified_social_account")).toBe(
        true,
      );
      expect(isProfileAttributeMet(undefined, "verified_website")).toBe(false);
    });

    it("isProfileAttributeMet treats unknown program bans as unmet", () => {
      expect(
        isProfileAttributeMet(
          { ...fullProfile, hasProgramBans: false },
          "no_program_bans",
        ),
      ).toBe(true);
      expect(
        isProfileAttributeMet(
          { ...fullProfile, hasProgramBans: true },
          "no_program_bans",
        ),
      ).toBe(false);
      expect(
        isProfileAttributeMet(
          { ...fullProfile, hasProgramBans: null },
          "no_program_bans",
        ),
      ).toBe(false);
    });

    it("isCountryConditionMet applies the operator", () => {
      const isCondition = { operator: "is" as const, value: ["US", "CA"] };
      expect(isCountryConditionMet("US", isCondition)).toBe(true);
      expect(isCountryConditionMet("GB", isCondition)).toBe(false);

      const isNotCondition = { operator: "is_not" as const, value: ["US"] };
      expect(isCountryConditionMet("GB", isNotCondition)).toBe(true);
      expect(isCountryConditionMet("US", isNotCondition)).toBe(false);
    });

    it("isCountryConditionMet fails closed on a missing country for both operators", () => {
      const isCondition = { operator: "is" as const, value: ["US"] };
      const isNotCondition = { operator: "is_not" as const, value: ["US"] };
      expect(isCountryConditionMet(null, isCondition)).toBe(false);
      expect(isCountryConditionMet(undefined, isCondition)).toBe(false);
      expect(isCountryConditionMet(null, isNotCondition)).toBe(false);
      expect(isCountryConditionMet(undefined, isNotCondition)).toBe(false);
    });
  });

  describe("getEligibilityContext", () => {
    it("returns an empty context for a missing partner", () => {
      expect(getEligibilityContext({ partner: null })).toEqual({});
    });

    it("derives profile context from partner data", () => {
      const context = getEligibilityContext({
        partner: {
          country: "US",
          email: "jane@acme.com",
          platforms: [
            { type: "website", verifiedAt: new Date() },
            { type: "youtube", verifiedAt: null },
          ],
        },
        programEnrollmentStatuses: ["approved", "banned"],
      });

      expect(context).toEqual({
        country: "US",
        email: "jane@acme.com",
        profile: {
          hasVerifiedWebsite: true,
          hasVerifiedSocialAccount: false,
          hasProgramBans: true,
        },
      });
    });

    it("treats an empty enrollment list as a known no-bans state", () => {
      const context = getEligibilityContext({
        partner: {},
        programEnrollmentStatuses: [],
      });

      expect(context.profile?.hasProgramBans).toBe(false);
    });

    it("marks program bans unknown when enrollment statuses are missing", () => {
      const context = getEligibilityContext({ partner: {} });

      expect(context.profile?.hasProgramBans).toBeNull();
    });

    it("fails closed on the no-bans requirement when enrollment statuses are missing", () => {
      const condition = {
        key: "profile" as const,
        operator: "has" as const,
        value: ["no_program_bans"],
      };

      const result = evaluate(
        [condition],
        getEligibilityContext({ partner: {} }),
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("requirementsNotMet");
    });
  });
});
