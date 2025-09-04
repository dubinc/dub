"use client";

import { messagePartnerAction } from "@/lib/actions/partners/message-partner";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { useProgramMessages } from "@/lib/swr/use-program-messages";
import useUser from "@/lib/swr/use-user";
import useWorkspace from "@/lib/swr/use-workspace";
import { useMessagesContext } from "@/ui/messages/messages-context";
import { MessagesPanel } from "@/ui/messages/messages-panel";
import { ToggleSidePanelButton } from "@/ui/messages/toggle-side-panel-button";
import { X } from "@/ui/shared/icons";
import { Button } from "@dub/ui";
import { ChevronLeft, LoadingSpinner } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { redirect, useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function PartnerMessagesProgramPageClient() {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { programSlug } = useParams() as { programSlug: string };
  const { user } = useUser();
  const { programEnrollment, error: errorProgramEnrollment } =
    useProgramEnrollment();
  const program = programEnrollment?.program;

  // const {
  //   executeAsync: markPartnerMessagesRead,
  //   isPending: isMarkingPartnerMessagesRead,
  // } = useAction(markPartnersMessagesReadAction);

  const {
    programMessages,
    error: errorMessages,
    mutate: mutateProgramMessages,
  } = useProgramMessages({
    query: { programSlug, sortOrder: "asc" },
    swrOpts: {
      // onSuccess: (data) => {
      //   // Mark unread messages from the partner as read
      //   if (
      //     !isMarkingPartnerMessagesRead &&
      //     data?.[0]?.messages?.some(
      //       (message) => message.senderPartnerId && !message.readInApp,
      //     )
      //   )
      //     markPartnerMessagesRead({
      //       workspaceId: workspaceId!,
      //       partnerId,
      //     });
      // },
    },
  });
  const messages = programMessages?.[0]?.messages;

  const { executeAsync: sendMessage } = useAction(messagePartnerAction);

  const { setCurrentPanel } = useMessagesContext();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  if (errorProgramEnrollment) redirect(`/messages`);

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
              {!program ? (
                <>
                  <div className="size-8 animate-pulse rounded-full bg-neutral-200" />
                  <div className="h-8 w-36 animate-pulse rounded-md bg-neutral-200" />
                </>
              ) : (
                <>
                  <img
                    src={program?.logo || "https://assets.dub.co/logo.png"}
                    alt={`${program?.name} logo`}
                    className="size-8 shrink-0 rounded-full"
                  />
                  <h2 className="text-content-emphasis min-w-0 truncate text-lg font-semibold leading-7">
                    {program?.name ?? "Program"}
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
            programImage={program?.logo}
            onSendMessage={async (message) => {
              toast.info("WIP");
              // const createdAt = new Date();

              // try {
              //   await mutateProgramMessages(
              //     async (data) => {
              //       const result = await sendMessage({
              //         workspaceId: workspaceId!,
              //         partnerId,
              //         text: message,
              //         createdAt,
              //       });

              //       if (!result?.data?.message)
              //         throw new Error(
              //           result?.serverError || "Failed to send message",
              //         );

              //       return data
              //         ? [
              //             {
              //               ...data[0],
              //               messages: [
              //                 ...data[0].messages,
              //                 result.data.message,
              //               ],
              //             },
              //           ]
              //         : [];
              //     },
              //     {
              //       optimisticData: (data) =>
              //         data
              //           ? [
              //               {
              //                 ...data[0],
              //                 messages: [
              //                   ...data[0].messages,
              //                   {
              //                     delivered: false,
              //                     id: `tmp_${uuid()}`,
              //                     programId: program!.id,
              //                     partnerId: partnerId,
              //                     text: message,

              //                     emailId: null,
              //                     readInApp: null,
              //                     readInEmail: null,
              //                     createdAt,
              //                     updatedAt: createdAt,

              //                     senderPartnerId: null,
              //                     senderPartner: null,
              //                     senderUserId: user!.id,
              //                     senderUser: {
              //                       id: user!.id,
              //                       name: user!.name,
              //                       image: user!.image || null,
              //                     },
              //                   },
              //                 ],
              //               },
              //             ]
              //           : [],
              //       rollbackOnError: true,
              //     },
              //   );

              //   mutatePrefix("/api/messages");
              // } catch (e) {
              //   console.log("Failed to send message", e);
              //   toast.error("Failed to send message");
              // }
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
              Program
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                text="View program"
                className="h-8 rounded-lg px-3"
                onClick={() =>
                  window.open(`/programs/${programSlug}`, "_blank")
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
            {program ? (
              <>{program.name}</>
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
