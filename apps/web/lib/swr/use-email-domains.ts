import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { EmailDomainProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useEmailDomains() {
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

  return {
    emailDomains,
    loading: !emailDomains && !error,
    mutate,
    error,
  };
}
