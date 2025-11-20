"use client";

import { markPartnerMessagesReadAction } from "@/lib/actions/partners/mark-partner-messages-read";
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
import { ChevronLeft } from "@dub/ui/icons";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";

export function ProgramMessagesPartnerPageClient() {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { partnerId } = useParams() as { partnerId: string };
  const { user } = useUser();
  const { program } = useProgram();
  const {
    partner: enrolledPartner,
    error: enrolledPartnerError,
    loading: enrolledPartnerLoading,
  } = usePartner(
    { partnerId },
    { shouldRetryOnError: (err) => err.status !== 404 },
  );

  const {
    executeAsync: markPartnerMessagesRead,
    isPending: isMarkingPartnerMessagesRead,
  } = useAction(markPartnerMessagesReadAction);

  const {
    partnerMessages,
    error: errorMessages,
    mutate: mutatePartnerMessages,
  } = usePartnerMessages({
    query: { partnerId, sortOrder: "asc" },
    swrOpts: {
      onSuccess: async (data) => {
        // Mark unread messages from the partner as read
        if (
          !isMarkingPartnerMessagesRead &&
          data?.[0]?.messages?.some(
            (message) => message.senderPartnerId && !message.readInApp,
          )
        ) {
          await markPartnerMessagesRead({
            workspaceId: workspaceId!,
            partnerId,
          });
          mutatePrefix("/api/messages");
        }
      },
    },
  });

  const partner = partnerMessages?.[0]?.partner;
  const messages = partnerMessages?.[0]?.messages;

  const { executeAsync: sendMessage } = useAction(messagePartnerAction);

  const { setCurrentPanel } = useMessagesContext();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  if (errorMessages) redirect(`/${workspaceSlug}/program/messages`);

  return (
    <div
      className="relative grid h-full"
      style={{
        gridTemplateColumns: "minmax(340px, 1fr) minmax(0, min-content)",
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-border-subtle flex h-12 shrink-0 items-center justify-between gap-4 border-b px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPanel("index")}
              className="@[800px]/page:hidden shrink-0 rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsRightPanelOpen((o) => !o)}
              disabled={!enrolledPartner}
              className="-mx-2 -my-1 flex items-center gap-2 rounded-lg px-2 py-1 transition-colors duration-100 enabled:hover:bg-black/5 enabled:active:bg-black/10"
            >
              {!partner ? (
                <>
                  <div className="size-6 animate-pulse rounded-full bg-neutral-200" />
                  <div className="h-8 w-36 animate-pulse rounded-md bg-neutral-200" />
                </>
              ) : (
                <>
                  <img
                    src={partner?.image || `${OG_AVATAR_URL}${partner?.name}`}
                    alt={`${partner?.name} avatar`}
                    className="size-6 shrink-0 rounded-full"
                  />
                  <h2 className="text-content-emphasis text-lg font-semibold leading-7">
                    {partner?.name ?? "Partner"}
                  </h2>
                </>
              )}
            </button>
          </div>
          {enrolledPartner ? (
            <ToggleSidePanelButton
              isOpen={isRightPanelOpen}
              onClick={() => setIsRightPanelOpen((o) => !o)}
            />
          ) : enrolledPartnerError ? (
            <ViewPartnerButton partnerId={partnerId} isEnrolled={false} />
          ) : null}
        </div>
        <div className="min-h-0 grow">
          <MessagesPanel
            messages={messages && user ? messages : undefined}
            error={errorMessages}
            currentUserType="user"
            currentUserId={user?.id || ""}
            program={program}
            partner={partner}
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
                                  subject: null,
                                  type: "direct",
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
              <ViewPartnerButton partnerId={partnerId} isEnrolled={true} />
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
            {enrolledPartnerLoading ? (
              <>
                <PartnerInfoSectionSkeleton />
                <PartnerInfoGroupSkeleton />
                <PartnerInfoStatsSkeleton className="xs:grid-cols-2" />
              </>
            ) : enrolledPartner ? (
              <>
                <PartnerInfoSection partner={enrolledPartner} />
                <PartnerInfoGroup partner={enrolledPartner} />
                <PartnerInfoStats
                  partner={enrolledPartner}
                  className="xs:grid-cols-2"
                />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerInfoSectionSkeleton() {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <div className="size-12 animate-pulse rounded-full bg-neutral-200" />
        <div className="mt-4 flex min-w-0 items-start gap-2">
          <div className="h-6 w-32 animate-pulse rounded-md bg-neutral-200" />
          <div className="h-5 w-16 animate-pulse rounded-md bg-neutral-200" />
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <div className="h-4 w-40 animate-pulse rounded-md bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}

function PartnerInfoGroupSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-100 p-2 pl-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="size-3 shrink-0 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-5 w-16 animate-pulse rounded-md bg-neutral-200" />
      </div>
      <div className="h-7 w-24 animate-pulse rounded-lg bg-neutral-200" />
    </div>
  );
}

function PartnerInfoStatsSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "xs:grid-cols-3 grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200",
        className,
      )}
    >
      {[...Array(6)].map((_, idx) => (
        <div key={idx} className="flex flex-col bg-neutral-50 p-3">
          <div className="h-3 w-16 animate-pulse rounded-md bg-neutral-200" />
          <div className="mt-1 h-5 w-20 animate-pulse rounded-md bg-neutral-200" />
        </div>
      ))}
    </div>
  );
}

function ViewPartnerButton({
  partnerId,
  isEnrolled,
}: {
  partnerId: string;
  isEnrolled: boolean;
}) {
  const { slug: workspaceSlug } = useWorkspace();

  return (
    <Link
      href={
        isEnrolled
          ? `/${workspaceSlug}/program/partners/${partnerId}`
          : `/${workspaceSlug}/program/network?partnerId=${partnerId}`
      }
      target="_blank"
    >
      <Button
        variant="secondary"
        text={isEnrolled ? "View profile" : "View partner"}
        className="h-8 rounded-lg px-3"
      />
    </Link>
  );
}
