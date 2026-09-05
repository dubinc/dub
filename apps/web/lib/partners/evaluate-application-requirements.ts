import { EligibilityConditionDB } from "../types";
import {
  applicationRequirementsSchema,
  EligibilityProfileAttribute,
} from "../zod/schemas/programs";

interface Context {
  country?: string | null;
  email?: string | null;
  profile?: {
    hasVerifiedWebsite: boolean;
    hasVerifiedSocialAccount: boolean;
    // null while the partner's enrollment statuses are unknown (still loading
    // or failed to load), so the attribute fails closed
    hasProgramBans: boolean | null;
  } | null;
}

export type EligibilityContext = Context;

// Builds the evaluation context from a partner (plus their program enrollment
// statuses)
export function getEligibilityContext({
  partner,
  programEnrollmentStatuses,
}: {
  partner?: {
    country?: string | null;
    email?: string | null;
    platforms?: { type: string; verifiedAt: Date | string | null }[] | null;
  } | null;
  programEnrollmentStatuses?: string[] | null;
}): Context {
  if (!partner) {
    return {};
  }

  const platforms = partner.platforms ?? [];

  return {
    country: partner.country,
    email: partner.email,
    profile: {
      hasVerifiedWebsite: platforms.some(
        (p) => p.type === "website" && !!p.verifiedAt,
      ),
      hasVerifiedSocialAccount: platforms.some(
        (p) => p.type !== "website" && !!p.verifiedAt,
      ),
      // Unknown enrollment statuses (still loading or failed to load) stay
      // null rather than reading "no data" as "no bans"; an empty array is a
      // known state and evaluates to no bans
      hasProgramBans: programEnrollmentStatuses
        ? programEnrollmentStatuses.includes("banned")
        : null,
    },
  };
}

// Missing context data fails closed (attribute counts as unmet)
export function isProfileAttributeMet(
  profile: Context["profile"],
  attribute: EligibilityProfileAttribute,
): boolean {
  if (!profile) {
    return false;
  }

  const checks: Record<EligibilityProfileAttribute, boolean> = {
    verified_website: profile.hasVerifiedWebsite,
    verified_social_account: profile.hasVerifiedSocialAccount,
    // unknown (null) counts as unmet
    no_program_bans: profile.hasProgramBans === false,
  };

  return checks[attribute];
}

// Shared between enforcement and the eligibility card so the two can't drift.
// A missing country fails closed for both operators.
export function isCountryConditionMet(
  country: Context["country"],
  condition: Pick<EligibilityConditionDB, "operator" | "value">,
): boolean {
  if (!country) {
    return false;
  }

  const matches = condition.value.includes(country);

  return condition.operator === "is_not" ? !matches : matches;
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

function evaluateCondition({
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
      return isCountryConditionMet(context.country, condition);
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

    case "profile": {
      matches = condition.value.every((attribute) =>
        isProfileAttributeMet(
          context.profile,
          attribute as EligibilityProfileAttribute,
        ),
      );

      break;
    }

    default:
      return false;
  }

  return condition.operator === "is_not" ? !matches : matches;
}
