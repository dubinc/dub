import { EligibilityConditionDB } from "../types";
import {
  applicationRequirementsSchema,
  EligibilityAccountAttribute,
  EligibilityProfileAttribute,
} from "../zod/schemas/programs";

interface Context {
  country?: string | null;
  email?: string | null;
  profile?: {
    hasDescription: boolean;
    hasVerifiedWebsite: boolean;
    hasVerifiedSocialAccount: boolean;
    hasPreferredEarningStructure: boolean;
    hasSalesChannel: boolean;
    hasMonthlyTraffic: boolean;
  } | null;
  account?: {
    isDubNetworkApproved: boolean;
    hasProgramBans: boolean;
  } | null;
}

export type EligibilityContext = Context;

// Builds the evaluation context from a partner (plus their program enrollment
// statuses). Handles both the client-side PartnerProps shape (enum arrays for
// preferredEarningStructures/salesChannels) and the server-side Prisma shape
// (relation rows) — only array length is used for those fields.
export function getEligibilityContext({
  partner,
  programEnrollmentStatuses,
}: {
  partner?: {
    country?: string | null;
    email?: string | null;
    description?: string | null;
    monthlyTraffic?: string | null;
    networkStatus?: string | null;
    platforms?: { type: string; verifiedAt: Date | string | null }[] | null;
    preferredEarningStructures?: unknown[] | null;
    salesChannels?: unknown[] | null;
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
      hasDescription: !!partner.description,
      hasVerifiedWebsite: platforms.some(
        (p) => p.type === "website" && !!p.verifiedAt,
      ),
      hasVerifiedSocialAccount: platforms.some(
        (p) => p.type !== "website" && !!p.verifiedAt,
      ),
      hasPreferredEarningStructure:
        (partner.preferredEarningStructures?.length ?? 0) > 0,
      hasSalesChannel: (partner.salesChannels?.length ?? 0) > 0,
      hasMonthlyTraffic: !!partner.monthlyTraffic,
    },
    account: {
      isDubNetworkApproved: ["approved", "trusted"].includes(
        partner.networkStatus ?? "",
      ),
      hasProgramBans: (programEnrollmentStatuses ?? []).includes("banned"),
    },
  };
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

    case "profile": {
      const { profile } = context;

      if (!profile) {
        return false;
      }

      const checks: Record<EligibilityProfileAttribute, boolean> = {
        description: profile.hasDescription,
        verified_website: profile.hasVerifiedWebsite,
        verified_social_account: profile.hasVerifiedSocialAccount,
        preferred_earning_structure: profile.hasPreferredEarningStructure,
        sales_channels: profile.hasSalesChannel,
        estimated_monthly_traffic: profile.hasMonthlyTraffic,
      };

      matches = condition.value.every(
        (attribute) => checks[attribute as EligibilityProfileAttribute],
      );

      break;
    }

    case "account": {
      const { account } = context;

      if (!account) {
        return false;
      }

      const checks: Record<EligibilityAccountAttribute, boolean> = {
        dub_network_approved: account.isDubNetworkApproved,
        no_program_bans: !account.hasProgramBans,
      };

      matches = condition.value.every(
        (attribute) => checks[attribute as EligibilityAccountAttribute],
      );

      break;
    }

    default:
      return false;
  }

  return condition.operator === "is_not" ? !matches : matches;
}
