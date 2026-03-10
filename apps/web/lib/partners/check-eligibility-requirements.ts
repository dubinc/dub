import { EligibilityConditionDB } from "@/lib/zod/schemas/programs";

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

export function partnerMeetsCondition(
  condition: EligibilityConditionDB,
  partner:
    | { country?: string | null; email?: string | null }
    | null
    | undefined,
): boolean {
  if (!partner) return false;

  if (condition.key === "country") {
    const partnerCountry = partner.country;
    if (!partnerCountry) return false;

    if (condition.operator === "is") {
      return condition.value.includes(partnerCountry);
    } else {
      return !condition.value.includes(partnerCountry);
    }
  }

  if (condition.key === "emailDomain") {
    const partnerEmail = partner.email;
    if (!partnerEmail) return false;

    const matches = condition.value.some((pattern) =>
      emailMatchesPattern(partnerEmail, pattern),
    );

    if (condition.operator === "is") {
      return matches;
    } else {
      return !matches;
    }
  }

  return false;
}

export function partnerMeetsAllRequirements(
  requirements: EligibilityConditionDB[],
  partner:
    | { country?: string | null; email?: string | null }
    | null
    | undefined,
): boolean {
  return requirements.every((c) => partnerMeetsCondition(c, partner));
}
