import { EmailDomainProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export function useEmailDomains() {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const {
    data: emailDomains,
    error,
    mutate,
  } = useSWR<EmailDomainProps[]>(
    workspaceId && defaultProgramId
      ? `/api/email-domains?workspaceId=${workspaceId}`
      : null,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  const verifiedEmailDomain = useMemo(() => {
    return emailDomains?.find((domain) => domain.status === "verified");
  }, [emailDomains]);

  return {
    emailDomains,
    verifiedEmailDomain,
    loading: !emailDomains && !error,
    mutate,
    error,
  };
}
