"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookProps } from "@/lib/types";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, MaxWidthWrapper, Popover, TokenAvatar } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { ChevronLeft, Edit3, FileStack, Send, Trash } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { useDeleteWebhookModal } from "../modals/delete-webhook-modal";
import { useSendTestWebhookModal } from "../modals/send-test-webhook-modal";

export default function WebhookHeader({
  webhookId,
  page,
}: {
  webhookId: string;
  page: "edit" | "events";
}) {
  const router = useRouter();
  const { slug, id: workspaceId, role } = useWorkspace();
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
        <div className="flex items-center justify-between gap-2">
          {isLoading ? (
            <div className="flex items-center gap-x-3">
              <div className="rounded-md border border-gray-200 bg-gradient-to-t from-gray-100 p-2">
                <TokenAvatar id="placeholder-oauth-app" className="size-8" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-3 w-20 rounded-full bg-gray-100"></div>
                <div className="h-3 w-80 rounded-full bg-gray-100"></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-x-3">
              <div className="rounded-md border border-gray-200 bg-gradient-to-t from-gray-100 p-2">
                <TokenAvatar id={webhook?.name!} className="size-8" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">{webhook?.name}</p>
                <p className="text-sm text-gray-500">{webhook?.url}</p>
              </div>
            </div>
          )}

          <Popover
            content={
              <div className="grid w-screen gap-px p-2 sm:w-48">
                {page === "events" && (
                  <Button
                    text="Update webhook"
                    variant="outline"
                    icon={<Edit3 className="h-4 w-4" />}
                    className="h-9 justify-start px-2 font-medium"
                    onClick={async () => {
                      setOpenPopover(false);
                      router.push(
                        `/${slug}/settings/webhooks/${webhookId}/edit`,
                      );
                    }}
                  />
                )}

                {page === "edit" && (
                  <Button
                    text="Webhook logs"
                    variant="outline"
                    icon={<FileStack className="h-4 w-4" />}
                    className="h-9 justify-start px-2 font-medium"
                    onClick={async () => {
                      setOpenPopover(false);
                      router.push(`/${slug}/settings/webhooks/${webhookId}`);
                    }}
                  />
                )}

                <Button
                  text="Send test event"
                  variant="outline"
                  icon={<Send className="h-4 w-4" />}
                  className="h-9 justify-start px-2"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowSendTestWebhookModal(true);
                  }}
                />

                <Button
                  text="Delete webhook"
                  variant="danger-outline"
                  icon={<Trash className="h-4 w-4" />}
                  className="h-9 justify-start px-2"
                  onClick={() => {
                    setDeleteWebhookModal(true);
                  }}
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
              {...(permissionsError && {
                disabledTooltip: permissionsError,
              })}
            />
          </Popover>
        </div>
      </MaxWidthWrapper>
    </>
  );
}
