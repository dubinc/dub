import { partnerCrossProgramSummarySchema } from "@/lib/zod/schemas/partners";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import useWorkspace from "./use-workspace";

type CrossProgramSummary = z.infer<typeof partnerCrossProgramSummarySchema>;

export function usePartnerCrossProgramSummary({
  partnerId,
  enabled = true,
}: {
  partnerId: string | null | undefined;
  enabled?: boolean;
}) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error } = useSWR<CrossProgramSummary>(
    enabled && partnerId && workspaceId
      ? `/api/partners/${partnerId}/cross-program-summary?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  return {
    crossProgramSummary: data,
    isLoading,
    error,
  };
}
