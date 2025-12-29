import { crossProgramActivitySchema } from "@/lib/zod/schemas/partners";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import useWorkspace from "./use-workspace";

type CrossProgramActivity = z.infer<typeof crossProgramActivitySchema>;

export function useCrossProgramActivity({
  partnerId,
  enabled = true,
}: {
  partnerId: string | null | undefined;
  enabled?: boolean;
}) {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading, error } = useSWR<CrossProgramActivity>(
    enabled && partnerId && workspaceId
      ? `/api/partners/${partnerId}/cross-program-activity?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  return {
    crossProgramActivity: data,
    isLoading,
    error,
  };
}

