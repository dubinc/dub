"use client";

import {
  APPLICATION_FRAUD_RULES,
  APPLICATION_FRAUD_SEVERITY_CONFIG,
} from "@/lib/fraud/constants";
import { ApplicationFraudSeverity } from "@/lib/fraud/types";
import {
  EnrolledPartnerExtendedProps,
  EnrolledPartnerProps,
} from "@/lib/types";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useMemo } from "react";
import { ApplicationFraudSeverityIndicator } from "./application-fraud-severity-indicator";

const ruleChecks: Record<
  (typeof APPLICATION_FRAUD_RULES)[number]["type"],
  (partner: EnrolledPartnerProps) => boolean
> = {
  partnerEmailDomainMismatch: checkPartnerEmailDomainMismatch,
  partnerEmailMasked: checkPartnerEmailMasked,
  partnerNoSocialLinks: checkPartnerNoSocialLinks,
  partnerNoVerifiedSocialLinks: checkPartnerNoVerifiedSocialLinks,
};

interface PartnerApplicationRiskAnalysisProps {
  partner: EnrolledPartnerExtendedProps;
  onViewClick?: () => void;
}

// Displays the risk analysis for a partner application
export function PartnerApplicationRiskAnalysis({
  partner,
  onViewClick,
}: PartnerApplicationRiskAnalysisProps) {
  const triggeredRules = useMemo(
    () => assessPartnerApplicationRisk(partner),
    [partner],
  );

  const overallRisk = useMemo(
    () => getHighestSeverity(triggeredRules),
    [triggeredRules],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-content-emphasis text-sm font-semibold">
          Risk analysis
        </h3>

        <Button
          type="button"
          text="View"
          variant="secondary"
          onClick={onViewClick}
          className="h-6 w-fit px-1.5 py-2"
        />
      </div>

      <ApplicationFraudSeverityIndicator severity={overallRisk} />

      {triggeredRules.length > 0 && (
        <ul className="space-y-2.5">
          {triggeredRules.map((rule) => {
            return (
              <li key={rule.type} className="flex items-start gap-2.5">
                <div
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full",
                    APPLICATION_FRAUD_SEVERITY_CONFIG[rule.severity].color,
                  )}
                />
                <span className="text-sm leading-5 text-neutral-700">
                  {rule.name}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {triggeredRules.length === 0 && (
        <p className="text-sm text-neutral-500">No risk factors detected.</p>
      )}
    </div>
  );
}

/**
 * Analyzes partner application for fraud risk by checking:
 * 1. Email domain mismatch with website
 * 2. Masked email address (Apple ID)
 * 3. No social links provided
 * 4. No verified social links
 */
function assessPartnerApplicationRisk(partner: EnrolledPartnerExtendedProps) {
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
  const hasVerifiedWebsite = partner.websiteVerifiedAt !== null;

  const hasVerifiedSocialLinks =
    partner.youtubeVerifiedAt !== null ||
    partner.twitterVerifiedAt !== null ||
    partner.linkedinVerifiedAt !== null ||
    partner.instagramVerifiedAt !== null ||
    partner.tiktokVerifiedAt !== null;

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
