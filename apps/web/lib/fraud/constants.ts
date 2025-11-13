import { FraudRiskLevel, FraudRuleType } from "@dub/prisma/client";
import { FraudReason } from "./types";

// Risk level weights for calculating risk score
export const RISK_LEVEL_WEIGHTS: Record<FraudRiskLevel, number> = {
  high: 10,
  medium: 5,
  low: 1,
};

// Risk level order for determining overall risk level
export const RISK_LEVEL_ORDER: Record<FraudRiskLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const FRAUD_RISK_LEVEL_BADGES = {
  high: {
    label: "High",
    variant: "error",
  },
  medium: {
    label: "Medium",
    variant: "warning",
  },
  low: {
    label: "Low",
    variant: "pending",
  },
} as const;

export const FRAUD_EVENT_STATUS_BADGES = {
  pending: {
    label: "Pending",
    variant: "pending",
  },
  safe: {
    label: "Safe",
    variant: "success",
  },
  banned: {
    label: "Banned",
    variant: "error",
  },
} as const;

export const FRAUD_RULE_TYPE_LABELS: Record<FraudRuleType, string> = {
  selfReferral: "Self-referral",
  bannedReferralDomain: "Banned referral domain",
  paidAdTrafficDetected: "Paid ad traffic detected",
  customerEmailSuspiciousDomain: "Customer email suspicious domain",
} as const;

export const FRAUD_REASON_LABELS: Record<FraudReason, string> = {
  selfReferralEmailMatch: "Self-referral detected: email match",
  selfReferralNameMatch: "Self-referral detected: name match",
  selfReferralEmailExactMatch: "Self-referral detected: exact email match",
  selfReferralEmailDomainVariation:
    "Self-referral detected: similar email domain",
  selfReferralEmailLevenshtein: "Self-referral detected: similar email address",
  selfReferralNameExactMatch: "Self-referral detected: exact name match",
  selfReferralNameLevenshtein: "Self-referral detected: similar name",
  customerEmailDisposableDomain: "Customer email from disposable email domain",
  paidAdTrafficDetected: "Paid ad traffic detected",
  bannedReferralDomain: "Banned referral domain",
} as const;
