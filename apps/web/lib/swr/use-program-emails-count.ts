import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import {
  programEmailsCountQuerySchema,
  programEmailsCountSchema,
  programEmailsGroupedCountSchema,
} from "../zod/schemas/program-emails";
import useWorkspace from "./use-workspace";

export default function useProgramEmailsCount<
  T extends
    | z.infer<typeof programEmailsCountSchema>
    | z.infer<typeof programEmailsGroupedCountSchema>,
>({
  query,
}: {
  query?: z.input<typeof programEmailsCountQuerySchema>;
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { data: count, error } = useSWR<T>(
    workspaceId &&
      defaultProgramId &&
      `/api/programs/${defaultProgramId}/emails/count?${new URLSearchParams({
        workspaceId: workspaceId,
        ...query,
      } as Record<string, any>).toString()}`,
    fetcher,
  );

  return {
    count,
    error,
    loading: !count && !error,
  };
}
