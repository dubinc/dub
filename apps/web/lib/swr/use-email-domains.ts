import { EmailDomainProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export function useEmailDomains() {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { data, error, mutate } = useSWR<EmailDomainProps[]>(
    workspaceId && defaultProgramId
      ? `/api/email-domains?workspaceId=${workspaceId}`
      : null,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    emailDomains: data || [],
    loading: !data && !error,
    mutate,
    error,
  };
}
