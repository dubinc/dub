"use client";

import usePartner from "@/lib/swr/use-partner";
import useWorkspace from "@/lib/swr/use-workspace";
import { useMessagesContext } from "@/ui/messages/messages-context";
import { Message, MessagesPanel } from "@/ui/messages/messages-panel";
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

const DEMO_MESSAGES: Message[] = [
  {
    id: "1",
    text: "Checking to see if I'm applicable for that new product?",
    sender: {
      type: "partner",
      id: "pn_1",
      name: "Tim Wilson",
      avatar: "https://dubassets.com/avatars/clro5ctqd0000jv084g63ua08",
    },
    createdAt: new Date("2025-08-26T12:00:00Z"),
  },
  {
    id: "2",
    text: "You are for sure eligible. We'll most likely make those changes within the next day or two. Stay tuned.",
    sender: {
      type: "user",
      id: "user_1",
      name: "Tim Wilson",
      avatar: "https://dubassets.com/avatars/clro5ctqd0000jv084g63ua08",
      groupAvatar:
        "https://dev.dubassets.com/programs/pg_cm1ze1d510001ekktgfxnj76j/logo_zYzinxG",
    },
    createdAt: new Date("2025-08-26T13:05:00Z"),
    readInEmail: new Date(),
  },
];

export function ProgramMessagesPartnerPageClient() {
  const { slug: workspaceSlug } = useWorkspace();

  const { partnerId } = useParams() as { partnerId: string };
  const { partner, loading, error } = usePartner({ partnerId });

  // TODO: [Messages] fetch+persist real data from/to API
  const [messages, setMessages] = useState(DEMO_MESSAGES);

  const { setCurrentPanel } = useMessagesContext();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  if (error) redirect(`/${workspaceSlug}/program/messages`);

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
              {loading ? (
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
            error={undefined}
            currentUserType="user"
            currentUserId="user_1"
            onSendMessage={(message) =>
              setMessages((prev) => [
                ...prev,
                {
                  id: `msg_${prev.length + 1}`,
                  text: message,
                  createdAt: new Date(),
                  delivered: false,
                  sender: {
                    type: "user",
                    id: "user_1",
                    name: "Tim Wilson",
                    avatar:
                      "https://dubassets.com/avatars/clro5ctqd0000jv084g63ua08",
                  },
                },
              ])
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
