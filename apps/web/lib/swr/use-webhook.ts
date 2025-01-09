import { WebhookProps } from "@/lib/types";
import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export default function useWebhook() {
  const { id: workspaceId } = useWorkspace();
  const { webhookId } = useParams();

  const {
    data: webhook,
    error,
    mutate,
  } = useSWR<WebhookProps>(
    workspaceId &&
      webhookId &&
      `/api/webhooks/${webhookId}?workspaceId=${workspaceId}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    webhook,
    mutate,
    isLoading: workspaceId && webhookId && !webhook && !error,
  };
}
