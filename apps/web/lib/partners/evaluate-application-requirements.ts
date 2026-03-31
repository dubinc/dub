import { EligibilityConditionDB } from "../types";
import { applicationRequirementsSchema } from "../zod/schemas/programs";

interface Context {
  country?: string | null;
  email?: string | null;
}

interface Result {
  valid: boolean;
  reason:
    | "invalidRequirements"
    | "noRequirements"
    | "requirementsMet"
    | "requirementsNotMet";
}

// valid: @domain.com, @*.edu, @*.acme.com, @sub.domain.co.uk
// wildcard: @*.<optional-segments.>tld  e.g. @*.edu, @*.acme.com
// exact:    @<segment.>+tld             e.g. @acme.com, @mail.acme.com
const DOMAIN_PATTERN =
  /^@(\*\.([a-z0-9][a-z0-9-]*\.)*[a-z]{2,}|[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)*\.[a-z]{2,})$/i;

export function isValidDomainPattern(v: string): boolean {
  return DOMAIN_PATTERN.test(v.trim());
}

function getEmailDomain(email: string): string {
  const parts = email.split("@");
  return parts.length === 2 ? `@${parts[1].toLowerCase()}` : "";
}

function emailMatchesPattern(email: string, pattern: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) return false;

  if (pattern.startsWith("@*")) {
    const suffix = pattern.slice(2);
    return domain.endsWith(suffix);
  }

  return domain === pattern;
}

export function evaluateApplicationRequirements({
  applicationRequirements,
  context,
}: {
  applicationRequirements: unknown;
  context: Context;
}): Result {
  if (applicationRequirements == null) {
    return {
      valid: true,
      reason: "noRequirements",
    };
  }

  const parsed = applicationRequirementsSchema.safeParse(
    applicationRequirements,
  );

  if (!parsed.success) {
    return {
      valid: false,
      reason: "invalidRequirements",
    };
  }

  const requirements = parsed.data;

  if (!requirements?.length) {
    return {
      valid: true,
      reason: "noRequirements",
    };
  }

  const allMet = requirements.every((condition) =>
    evaluateCondition({
      condition,
      context,
    }),
  );

  return {
    valid: allMet,
    reason: allMet ? "requirementsMet" : "requirementsNotMet",
  };
}

export function evaluateCondition({
  condition,
  context,
}: {
  condition: EligibilityConditionDB;
  context: Context;
}): boolean {
  if (!context) {
    return false;
  }

  let matches = false;

  switch (condition.key) {
    case "country": {
      if (!context.country) {
        return false;
      }

      matches = condition.value.includes(context.country);

      break;
    }

    case "emailDomain": {
      if (!context.email) {
        return false;
      }

      matches = condition.value.some((pattern) =>
        emailMatchesPattern(context.email!, pattern),
      );

      break;
    }

    default:
      return false;
  }

  return condition.operator === "is" ? matches : !matches;
}
