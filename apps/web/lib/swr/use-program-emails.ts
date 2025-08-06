import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import {
  programEmailSchema,
  programEmailsQuerySchema,
} from "../zod/schemas/program-emails";
import useWorkspace from "./use-workspace";

export default function useProgramEmails({
  query,
}: {
  query?: z.input<typeof programEmailsQuerySchema>;
} = {}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { data: emails, error } = useSWR<z.infer<typeof programEmailSchema>[]>(
    workspaceId &&
      defaultProgramId &&
      `/api/programs/${defaultProgramId}/emails?${new URLSearchParams({
        workspaceId: workspaceId,
        ...query,
      } as Record<string, any>).toString()}`,
    fetcher,
  );

  return {
    emails,
    error,
    loading: !emails && !error,
  };
}
