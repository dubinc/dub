import { FRAUD_RULES, FRAUD_SEVERITY_CONFIG } from "@/lib/api/fraud/constants";
import {
  ExtendedFraudRuleType,
  FraudRuleInfo,
  FraudSeverity,
} from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

type FraudRisksResponse = Partial<Record<ExtendedFraudRuleType, boolean>>;

function getHighestSeverity(
  triggeredRules: FraudRuleInfo[],
): FraudSeverity | null {
  let highest: FraudSeverity | null = null;
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

export function usePartnerApplicationRisks({
  filters,
  enabled = true,
}: {
  filters: { partnerId: string | null | undefined };
  enabled?: boolean;
}) {
  const { id: workspaceId } = useWorkspace();
  const { partnerId } = filters;

  const {
    data: risks,
    isLoading,
    error,
  } = useSWR<FraudRisksResponse>(
    enabled && partnerId && workspaceId
      ? `/api/partners/${partnerId}/application-risks?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const triggeredFraudRules = useMemo(() => {
    if (!risks) return [];

    return FRAUD_RULES.filter((rule) => {
      return risks[rule.type] === true;
    });
  }, [risks]);

  const severity = useMemo<FraudSeverity | null>(() => {
    if (!risks || triggeredFraudRules.length === 0) return null;

    return getHighestSeverity(triggeredFraudRules);
  }, [risks, triggeredFraudRules]);

  return {
    risks,
    triggeredFraudRules,
    severity,
    isLoading,
    error,
  };
}
