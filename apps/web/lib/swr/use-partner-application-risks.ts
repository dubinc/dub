import { FRAUD_RULES } from "@/lib/api/fraud/constants";
import { ExtendedFraudRuleType, FraudSeverity } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

type FraudRisksResponse = {
  risksDetected: Partial<Record<ExtendedFraudRuleType, boolean>>;
  riskSeverity: FraudSeverity | null;
};

export function usePartnerApplicationRisks({
  filters,
  enabled = true,
}: {
  filters: { partnerId: string | null | undefined };
  enabled?: boolean;
}) {
  const { id: workspaceId } = useWorkspace();
  const { partnerId } = filters;

  const { data, isLoading, error } = useSWR<FraudRisksResponse>(
    enabled && partnerId && workspaceId
      ? `/api/partners/${partnerId}/application-risks?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const { risksDetected, riskSeverity } = data || {};

  const triggeredFraudRules = useMemo(() => {
    if (!risksDetected) return [];

    return FRAUD_RULES.filter((rule) => {
      return risksDetected[rule.type] === true;
    });
  }, [risksDetected]);

  return {
    risks: risksDetected,
    triggeredFraudRules,
    severity: riskSeverity,
    isLoading,
    error,
  };
}
