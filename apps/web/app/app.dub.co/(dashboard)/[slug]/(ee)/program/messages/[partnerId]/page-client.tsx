"use client";

import { messagePartnerAction } from "@/lib/actions/partners/message-partner";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartner from "@/lib/swr/use-partner";
import { usePartnerMessages } from "@/lib/swr/use-partner-messages";
import useProgram from "@/lib/swr/use-program";
import useUser from "@/lib/swr/use-user";
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
import { useAction } from "next-safe-action/hooks";
import { redirect, useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";

export function ProgramMessagesPartnerPageClient() {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { partnerId } = useParams() as { partnerId: string };
  const { user } = useUser();
  const { program } = useProgram();
  const { partner, error: errorPartner } = usePartner({ partnerId });
  const {
    partnerMessages,
    error: errorMessages,
    mutate: mutatePartnerMessages,
  } = usePartnerMessages({
    query: { partnerId, sortOrder: "asc" },
  });
  const messages = partnerMessages?.[0]?.messages;

  const { executeAsync: sendMessage } = useAction(messagePartnerAction);

  const { setCurrentPanel } = useMessagesContext();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

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
            messages={messages && user ? messages : undefined}
            error={errorMessages}
            currentUserType="user"
            currentUserId={user?.id || ""}
            onSendMessage={async (message) => {
              const createdAt = new Date();

              try {
                await mutatePartnerMessages(
                  async (data) => {
                    const result = await sendMessage({
                      workspaceId: workspaceId!,
                      partnerId,
                      text: message,
                      createdAt,
                    });

                    if (!result?.data?.message)
                      throw new Error(
                        result?.serverError || "Failed to send message",
                      );

                    return data
                      ? [
                          {
                            ...data[0],
                            messages: [
                              ...data[0].messages,
                              result.data.message,
                            ],
                          },
                        ]
                      : [];
                  },
                  {
                    optimisticData: (data) =>
                      data
                        ? [
                            {
                              ...data[0],
                              messages: [
                                ...data[0].messages,
                                {
                                  delivered: false,
                                  id: `tmp_${uuid()}`,
                                  programId: program!.id,
                                  partnerId: partnerId,
                                  text: message,

                                  emailId: null,
                                  readInApp: null,
                                  readInEmail: null,
                                  createdAt,
                                  updatedAt: createdAt,

                                  senderPartnerId: null,
                                  senderPartner: null,
                                  senderUserId: user!.id,
                                  senderUser: {
                                    id: user!.id,
                                    name: user!.name,
                                    image: user!.image || null,
                                  },
                                },
                              ],
                            },
                          ]
                        : [],
                    rollbackOnError: true,
                  },
                );

                mutatePrefix("/api/messages");
              } catch (e) {
                console.log("Failed to send message", e);
                toast.error("Failed to send message");
              }
            }}
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
