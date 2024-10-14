"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookProps } from "@/lib/types";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  CircleCheck,
  Copy,
  MaxWidthWrapper,
  Popover,
  TabSelect,
  TokenAvatar,
} from "@dub/ui";
import { fetcher } from "@dub/utils";
import { ChevronLeft, Send, Trash } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter, useSelectedLayoutSegment } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useDeleteWebhookModal } from "../modals/delete-webhook-modal";
import { useSendTestWebhookModal } from "../modals/send-test-webhook-modal";

export default function WebhookHeader({ webhookId }: { webhookId: string }) {
  const router = useRouter();
  const { slug, id: workspaceId, role } = useWorkspace();
  const [copiedWebhookId, setCopiedWebhookId] = useState(false);

  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  const [openPopover, setOpenPopover] = useState(false);

  const { data: webhook, isLoading } = useSWR<WebhookProps>(
    `/api/webhooks/${webhookId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  const { DeleteWebhookModal, setDeleteWebhookModal } = useDeleteWebhookModal({
    webhook,
  });

  const { SendTestWebhookModal, setShowSendTestWebhookModal } =
    useSendTestWebhookModal({
      webhook,
    });

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.write",
    role,
  });

  if (!isLoading && !webhook) {
    return notFound();
  }

  const copyWebhookId = () => {
    navigator.clipboard.writeText(webhookId);
    setCopiedWebhookId(true);
    toast.success("Webhook ID copied!");
    setTimeout(() => setCopiedWebhookId(false), 3000);
  };

  return (
    <>
      <MaxWidthWrapper className="grid max-w-screen-lg gap-8">
        <SendTestWebhookModal />
        <DeleteWebhookModal />
        <Link
          href={`/${slug}/settings/webhooks`}
          className="flex items-center gap-x-1"
        >
          <ChevronLeft className="size-4" />
          <p className="text-sm font-medium text-gray-500">Back to webhooks</p>
        </Link>
        <div className="flex justify-between gap-2 sm:items-center">
          {isLoading || !webhook ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-fit flex-none rounded-md border border-gray-200 bg-gradient-to-t from-gray-100 p-2">
                <TokenAvatar id="placeholder-oauth-app" className="size-8" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-5 w-28 rounded-full bg-gray-100"></div>
                <div className="h-3 w-48 rounded-full bg-gray-100"></div>
                <div className="h-3 w-40 rounded-full bg-gray-100"></div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-fit flex-none rounded-md border border-gray-200 bg-gradient-to-t from-gray-100 p-2">
                <TokenAvatar id={webhook.id} className="size-8" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">{webhook.name}</p>
                <a
                  href={webhook.url}
                  target="_blank"
                  className="text-pretty text-sm text-gray-500 underline-offset-4 hover:text-gray-700 hover:underline"
                >
                  {webhook.url}
                </a>
              </div>
            </div>
          )}

          <Popover
            content={
              <div className="grid w-screen gap-px p-2 sm:w-48">
                <Button
                  text="Send test event"
                  variant="outline"
                  icon={<Send className="size-4" />}
                  className="h-9 justify-start px-2"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowSendTestWebhookModal(true);
                  }}
                />

                <Button
                  text="Copy Webhook ID"
                  variant="outline"
                  icon={
                    copiedWebhookId ? (
                      <CircleCheck className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )
                  }
                  className="h-9 justify-start px-2"
                  onClick={() => copyWebhookId()}
                />

                <Button
                  text="Delete webhook"
                  variant="danger-outline"
                  icon={<Trash className="size-4" />}
                  className="h-9 justify-start px-2"
                  onClick={() => {
                    setDeleteWebhookModal(true);
                  }}
                  disabled={!!permissionsError}
                  disabledTooltip={permissionsError}
                />
              </div>
            }
            align="end"
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
          >
            <Button
              variant="outline"
              className="flex w-8 rounded-md border border-gray-200 px-2 transition-[border-color] duration-200"
              icon={<ThreeDots className="h-5 w-5 shrink-0 text-gray-500" />}
              onClick={() => setOpenPopover(!openPopover)}
            />
          </Popover>
        </div>
        <div className="-ml-1.5 border-b border-gray-200">
          <TabSelect
            options={[
              { id: "", label: "Webhook Logs" },
              { id: "edit", label: "Update Details" },
            ]}
            selected={page}
            onSelect={(id: "" | "edit") => {
              router.push(`/${slug}/settings/webhooks/${webhookId}/${id}`);
            }}
            className="gap-2"
          />
        </div>
      </MaxWidthWrapper>
    </>
  );
}
