"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import WebhookHeader from "@/ui/webhooks/webhook-header";
import { MaxWidthWrapper } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { redirect } from "next/navigation";
import useSWR from "swr";

export default function WebhookLogsPageClient({
  webhookId,
}: {
  webhookId: string;
}) {
  const { slug, flags, role, id: workspaceId } = useWorkspace();

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.read",
    role,
  });

  if (!flags?.webhooks || permissionsError) {
    redirect(`/${slug}/settings`);
  }

  const { data, isLoading, error } = useSWR<any[]>(
    `/api/webhooks/${webhookId}/logs?workspaceId=${workspaceId}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return (
    <>
      <WebhookHeader webhookId={webhookId} />
      <MaxWidthWrapper className="max-w-screen-lg space-y-6">
        <></>
      </MaxWidthWrapper>
    </>
  );
}
