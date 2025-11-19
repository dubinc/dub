"use client";

import {
  APPLICATION_FRAUD_RULES,
  APPLICATION_FRAUD_SEVERITY_CONFIG,
} from "@/lib/fraud/constants";
import { ApplicationFraudSeverity } from "@/lib/fraud/types";
import { EnrolledPartnerExtendedProps } from "@/lib/types";

const ruleChecks: Record<
  (typeof APPLICATION_FRAUD_RULES)[number]["type"],
  (partner: EnrolledPartnerExtendedProps) => boolean
> = {
  partnerEmailDomainMismatch: checkPartnerEmailDomainMismatch,
  partnerEmailMasked: checkPartnerEmailMasked,
  partnerNoSocialLinks: checkPartnerNoSocialLinks,
  partnerNoVerifiedSocialLinks: checkPartnerNoVerifiedSocialLinks,
};

/**
 * Analyzes partner application for fraud risk by checking:
 * 1. Email domain mismatch with website
 * 2. Masked email address (Apple ID)
 * 3. No social links provided
 * 4. No verified social links
 */
export function assessPartnerApplicationRisk(
  partner: EnrolledPartnerExtendedProps,
) {
  const triggeredRules: (typeof APPLICATION_FRAUD_RULES)[number][] = [];

  for (const rule of APPLICATION_FRAUD_RULES) {
    const checkFunction = ruleChecks[rule.type];

    if (checkFunction && checkFunction(partner)) {
      triggeredRules.push(rule);
    }
  }

  return triggeredRules;
}

// Checks if the partner's email domain doesn't match their website domain
function checkPartnerEmailDomainMismatch(
  partner: EnrolledPartnerExtendedProps,
) {
  if (!partner.email || !partner.website) {
    return false;
  }

  const emailParts = partner.email.split("@");
  if (emailParts.length !== 2) {
    return false;
  }

  const emailDomain = emailParts[1].toLowerCase().trim();
  let websiteDomain: string;

  try {
    const websiteUrl = new URL(partner.website);
    websiteDomain = websiteUrl.hostname.toLowerCase().trim();
  } catch (error) {
    return false;
  }

  return emailDomain !== websiteDomain;
}

// Checks if the partner is using an Apple private relay email address
function checkPartnerEmailMasked(partner: EnrolledPartnerExtendedProps) {
  if (!partner.email) {
    return false;
  }

  const emailParts = partner.email.split("@");
  if (emailParts.length !== 2) {
    return false;
  }

  const domain = emailParts[1].toLowerCase().trim();

  return domain === "privaterelay.appleid.com";
}

// Checks if the partner has neither a website nor any social media links
function checkPartnerNoSocialLinks(partner: EnrolledPartnerExtendedProps) {
  const hasWebsite = partner.website && partner.website.trim().length > 0;

  const hasSocialLinks =
    (partner.youtube && partner.youtube.trim().length > 0) ||
    (partner.twitter && partner.twitter.trim().length > 0) ||
    (partner.linkedin && partner.linkedin.trim().length > 0) ||
    (partner.instagram && partner.instagram.trim().length > 0) ||
    (partner.tiktok && partner.tiktok.trim().length > 0);

  return !hasWebsite && !hasSocialLinks;
}

// Checks if the partner has no verified website or social media links
function checkPartnerNoVerifiedSocialLinks(
  partner: EnrolledPartnerExtendedProps,
) {
  const hasVerifiedWebsite = partner.websiteVerifiedAt != null;

  const hasVerifiedSocialLinks =
    partner.youtubeVerifiedAt != null ||
    partner.twitterVerifiedAt != null ||
    partner.linkedinVerifiedAt != null ||
    partner.instagramVerifiedAt != null ||
    partner.tiktokVerifiedAt != null;

  return !hasVerifiedWebsite && !hasVerifiedSocialLinks;
}

export function getHighestSeverity(
  rules: readonly { severity: ApplicationFraudSeverity }[],
): ApplicationFraudSeverity {
  let highest: ApplicationFraudSeverity = "low";
  let highestRank = APPLICATION_FRAUD_SEVERITY_CONFIG.low.rank;

  for (const { severity } of rules) {
    const rank = APPLICATION_FRAUD_SEVERITY_CONFIG[severity].rank;

    if (rank > highestRank) {
      highestRank = rank;
      highest = severity;
    }
  }

  return highest;
}
