import { EmailDomainProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useEmailDomains() {
  const { id: workspaceId, partnersEnabled } = useWorkspace();

  const {
    error,
    mutate,
    data: emailDomains,
  } = useSWR<EmailDomainProps[]>(
    partnersEnabled &&
      workspaceId &&
      `/api/email-domains?workspaceId=${workspaceId}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    emailDomains,
    mutate,
    error,
    loading: !emailDomains && !error ? true : false,
  };
}
