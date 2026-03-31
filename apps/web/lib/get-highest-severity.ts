import { FRAUD_SEVERITY_CONFIG } from "@/lib/api/fraud/constants";
import { FraudRuleInfo, FraudSeverity } from "@/lib/types";

export function getHighestSeverity(
  triggeredRules: FraudRuleInfo[],
): FraudSeverity | null {
  let highest: FraudSeverity | null = null;
  let highestRank = -Infinity;

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
