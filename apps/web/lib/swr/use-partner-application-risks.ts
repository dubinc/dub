import { FRAUD_RULES } from "@/lib/api/fraud/constants";
import { getHighestSeverity } from "@/lib/api/fraud/utils";
import { ExtendedFraudRuleType, FraudSeverity } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR, { SWRConfiguration } from "swr";
import useWorkspace from "./use-workspace";

type FraudRisksResponse = Partial<Record<ExtendedFraudRuleType, boolean>>;

export default function usePartnerApplicationRisks(
  {
    partnerId,
    enabled = true,
  }: {
    partnerId: string | null | undefined;
    enabled?: boolean;
  },
  swrOptions: SWRConfiguration = {},
) {
  const { id: workspaceId } = useWorkspace();

  const { data: risks, isLoading, error } = useSWR<FraudRisksResponse>(
    enabled && partnerId && workspaceId
      ? `/api/partners/${partnerId}/risks?workspaceId=${workspaceId}`
      : null,
    fetcher,
    swrOptions,
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

