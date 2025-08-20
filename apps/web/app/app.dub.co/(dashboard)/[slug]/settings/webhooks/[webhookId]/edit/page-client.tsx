"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookProps } from "@/lib/types";
import AddEditWebhookForm from "@/ui/webhooks/add-edit-webhook-form";
import { MaxWidthWrapper } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { redirect } from "next/navigation";
import useSWR from "swr";

export default function UpdateWebhookPageClient({
  webhookId,
}: {
  webhookId: string;
}) {
  const { id: workspaceId, slug } = useWorkspace();

  const { data: webhook, isLoading } = useSWR<WebhookProps>(
    `/api/webhooks/${webhookId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  if (!isLoading && !webhook) {
    redirect(`/${slug}/settings/webhooks`);
  }

  return (
    <MaxWidthWrapper className="max-w-screen-lg space-y-6">
      {webhook && <AddEditWebhookForm webhook={webhook} />}
    </MaxWidthWrapper>
  );
}
