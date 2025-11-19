import { FRAUD_SEVERITY_CONFIG } from "@/lib/api/fraud/constants";
import { FraudRuleInfo, FraudSeverity } from "@/lib/types";

// Normalize email for comparison
export function normalizeEmail(email: string): string {
  const trimmed = email.toLowerCase().trim();
  const parts = trimmed.split("@");

  if (parts.length !== 2) {
    return trimmed;
  }

  let [username, domain] = parts;

  // Strip plus addressing for all domains
  const plusIndex = username.indexOf("+");
  if (plusIndex !== -1) {
    username = username.substring(0, plusIndex);
  }

  // Gmail and Google Mail treat dots as irrelevant
  if (domain === "gmail.com" || domain === "googlemail.com") {
    username = username.replace(/\./g, "");
  }

  return `${username}@${domain}`;
}

// Returns the highest severity of the triggered rules
export function getHighestSeverity(
  triggeredRules: FraudRuleInfo[],
): FraudSeverity {
  let highest: FraudSeverity = "low";
  let highestRank = FRAUD_SEVERITY_CONFIG.low.rank;

  for (const { severity } of triggeredRules) {
    if (!severity) continue;

    const rank = FRAUD_SEVERITY_CONFIG[severity].rank;

    if (rank > highestRank) {
      highest = severity;
      highestRank = rank;
    }
  }

  return highest;
}
