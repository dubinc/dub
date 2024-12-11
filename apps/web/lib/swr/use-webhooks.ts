import { WebhookProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useWebhooks() {
  const { id, plan } = useWorkspace();

  const {
    data: webhooks,
    isValidating,
    isLoading,
  } = useSWR<WebhookProps[]>(
    plan &&
      !["free", "pro"].includes(plan) &&
      `/api/webhooks?workspaceId=${id}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    webhooks,
    isLoading,
    isValidating,
  };
}
