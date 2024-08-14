"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookProps } from "@/lib/types";
import AddEditWebhookForm from "@/ui/webhooks/add-edit-webhook-form";
import WebhookHeader from "@/ui/webhooks/webhook-header";
import { MaxWidthWrapper } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { redirect } from "next/navigation";
import useSWR from "swr";

// TODO:
// Finish the remaining

export default function UpdateWebhookPageClient({
  webhookId,
}: {
  webhookId: string;
}) {
  const { slug, flags, role, id: workspaceId } = useWorkspace();

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.write",
    role,
  });

  if (!flags?.webhooks || permissionsError) {
    redirect(`/${slug}/settings`);
  }

  const { data: webhook, isLoading } = useSWR<WebhookProps>(
    `/api/webhooks/${webhookId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  return (
    <>
      <WebhookHeader webhookId={webhookId} />
      <MaxWidthWrapper className="max-w-screen-lg space-y-6">
        <AddEditWebhookForm webhook={null} />
      </MaxWidthWrapper>
    </>
  );
}
