"use client";

import usePartner from "@/lib/swr/use-partner";
import { usePartnerMessages } from "@/lib/swr/use-partner-messages";
import useWorkspace from "@/lib/swr/use-workspace";
import { useMessagesContext } from "@/ui/messages/messages-context";
import { MessagesPanel } from "@/ui/messages/messages-panel";
import { ToggleSidePanelButton } from "@/ui/messages/toggle-side-panel-button";
import { PartnerInfoGroup } from "@/ui/partners/partner-info-group";
import { PartnerInfoSection } from "@/ui/partners/partner-info-section";
import { PartnerInfoStats } from "@/ui/partners/partner-info-stats";
import { X } from "@/ui/shared/icons";
import { Button } from "@dub/ui";
import { ChevronLeft, LoadingSpinner } from "@dub/ui/icons";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import { redirect, useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function ProgramMessagesPartnerPageClient() {
  const { slug: workspaceSlug } = useWorkspace();

  const { partnerId } = useParams() as { partnerId: string };
  const { partner, error: errorPartner } = usePartner({ partnerId });
  const { partnerMessages, error: errorMessages } = usePartnerMessages({
    query: { partnerId },
  });
  const messages = partnerMessages?.[0]?.messages;

  const { setCurrentPanel } = useMessagesContext();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  if (errorPartner) redirect(`/${workspaceSlug}/program/messages`);

  return (
    <div
      className="relative grid h-full"
      style={{
        gridTemplateColumns: "minmax(340px, 1fr) minmax(0, min-content)",
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-border-subtle flex h-12 shrink-0 items-center justify-between gap-4 border-b px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPanel("index")}
              className="@[800px]/page:hidden shrink-0 rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <div className="flex min-w-0 items-center gap-3">
              {!partner ? (
                <>
                  <div className="size-8 animate-pulse rounded-full bg-neutral-200" />
                  <div className="h-8 w-36 animate-pulse rounded-md bg-neutral-200" />
                </>
              ) : (
                <>
                  <img
                    src={partner?.image || `${OG_AVATAR_URL}${partner?.id}`}
                    alt={`${partner?.name} avatar`}
                    className="size-8 shrink-0 rounded-full"
                  />
                  <h2 className="text-content-emphasis min-w-0 truncate text-lg font-semibold leading-7">
                    {partner?.name ?? "Partner"}
                  </h2>
                </>
              )}
            </div>
          </div>
          <ToggleSidePanelButton
            isOpen={isRightPanelOpen}
            onClick={() => setIsRightPanelOpen((o) => !o)}
          />
        </div>
        <div className="min-h-0 grow">
          <MessagesPanel
            messages={messages}
            error={errorMessages}
            currentUserType="user"
            currentUserId="user_1"
            onSendMessage={(message) =>
              // setMessages((prev) => [
              //   ...prev,
              //   {
              //     id: `msg_${prev.length + 1}`,
              //     text: message,
              //     createdAt: new Date(),
              //     delivered: false,
              //     sender: {
              //       type: "user",
              //       id: "user_1",
              //       name: "Tim Wilson",
              //       avatar:
              //         "https://dubassets.com/avatars/clro5ctqd0000jv084g63ua08",
              //     },
              //   },
              // ])
              toast.info("WIP")
            }
          />
        </div>
      </div>

      {/* Right panel - Profile */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full min-h-0 w-0 overflow-hidden bg-white shadow-lg transition-[width]",
          "@[960px]/page:shadow-none @[960px]/page:relative",
          isRightPanelOpen && "w-full sm:w-[340px]",
        )}
      >
        <div className="border-border-subtle flex size-full min-h-0 w-full flex-col border-l sm:w-[340px]">
          <div className="border-border-subtle flex h-12 shrink-0 items-center justify-between gap-4 border-b px-4 sm:h-16 sm:px-6">
            <h2 className="text-content-emphasis text-lg font-semibold leading-7">
              Profile
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                text="View profile"
                className="h-8 rounded-lg px-3"
                onClick={() =>
                  window.open(
                    `/${workspaceSlug}/program/partners?partnerId=${partnerId}`,
                    "_blank",
                  )
                }
              />
              <button
                type="button"
                onClick={() => setIsRightPanelOpen(false)}
                className="@[960px]/page:hidden rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          <div className="bg-bg-muted scrollbar-hide flex grow flex-col gap-4 overflow-y-scroll p-6">
            {partner ? (
              <>
                <PartnerInfoSection partner={partner} />
                <PartnerInfoGroup partner={partner} />
                <PartnerInfoStats
                  partner={partner}
                  className="xs:grid-cols-2"
                />
              </>
            ) : (
              <div className="flex size-full items-center justify-center">
                <LoadingSpinner />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
