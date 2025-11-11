"use client";

import { markProgramMessagesReadAction } from "@/lib/actions/partners/mark-program-messages-read";
import { messageProgramAction } from "@/lib/actions/partners/message-program";
import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { useProgramMessages } from "@/lib/swr/use-program-messages";
import useUser from "@/lib/swr/use-user";
import { ProgramEnrollmentProps } from "@/lib/types";
import { useMessagesContext } from "@/ui/messages/messages-context";
import { MessagesPanel } from "@/ui/messages/messages-panel";
import { ToggleSidePanelButton } from "@/ui/messages/toggle-side-panel-button";
import { ProgramHelpLinks } from "@/ui/partners/program-help-links";
import { ProgramRewardsPanel } from "@/ui/partners/program-rewards-panel";
import { X } from "@/ui/shared/icons";
import { Button, Grid, useCopyToClipboard, useMediaQuery } from "@dub/ui";
import {
  Check,
  ChevronLeft,
  Copy,
  EnvelopeArrowRight,
  LoadingSpinner,
  MsgsDotted,
} from "@dub/ui/icons";
import {
  OG_AVATAR_URL,
  capitalize,
  cn,
  currencyFormatter,
  formatDate,
  getPrettyUrl,
  nFormatter,
} from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";

export function PartnerMessagesProgramPageClient() {
  const { programSlug } = useParams() as { programSlug: string };
  const { isMobile } = useMediaQuery();

  const { user } = useUser();
  const { partner } = usePartnerProfile();
  const { programEnrollment, error: errorProgramEnrollment } =
    useProgramEnrollment();
  const program = programEnrollment?.program;

  const {
    executeAsync: markProgramMessagesRead,
    isPending: isMarkingProgramMessagesRead,
  } = useAction(markProgramMessagesReadAction);

  const {
    programMessages,
    error: errorMessages,
    mutate: mutateProgramMessages,
  } = useProgramMessages({
    query: { programSlug, sortOrder: "asc" },
    enabled: Boolean(programEnrollment?.program?.messagingEnabledAt),
    swrOpts: {
      onSuccess: async (data) => {
        // Mark unread messages from the program as read
        if (
          !isMarkingProgramMessagesRead &&
          data?.[0]?.messages?.some(
            (message) => !message.senderPartnerId && !message.readInApp,
          )
        ) {
          await markProgramMessagesRead({
            programSlug,
          });
          mutatePrefix("/api/partner-profile/messages");
        }
      },
    },
  });
  const messages = programMessages?.[0]?.messages;

  const { executeAsync: sendMessage } = useAction(messageProgramAction);

  const { setCurrentPanel } = useMessagesContext();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(!isMobile);

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
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setIsRightPanelOpen((o) => !o)}
                className="-mx-2 -my-1 flex items-center gap-3 rounded-lg px-2 py-1 transition-colors duration-100 hover:bg-black/5 active:bg-black/10"
              >
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
                    <h2 className="text-content-emphasis text-lg font-semibold leading-7">
                      {program?.name ?? "Program"}
                    </h2>
                  </>
                )}
              </button>
            </div>
          </div>
          <ToggleSidePanelButton
            isOpen={isRightPanelOpen}
            onClick={() => setIsRightPanelOpen((o) => !o)}
          />
        </div>
        {["banned", "rejected"].includes(programEnrollment?.status ?? "") ||
        programEnrollment?.program?.messagingEnabledAt === null ? (
          <div className="flex size-full flex-col items-center justify-center px-4">
            <MsgsDotted className="size-10 text-neutral-700" />
            <div className="mt-6 max-w-md text-center">
              <span className="text-content-emphasis text-base font-semibold">
                This program uses external support
              </span>
              <p className="text-content-subtle text-sm font-medium">
                You can contact them directly via email.
              </p>
            </div>
            {program?.supportEmail && (
              <Link href={`mailto:${program.supportEmail}`} target="_blank">
                <Button
                  className="mt-4 h-9 rounded-lg px-3"
                  variant="secondary"
                  text="Email support"
                  icon={<EnvelopeArrowRight className="size-4" />}
                />
              </Link>
            )}
          </div>
        ) : (
          <div className="min-h-0 grow">
            <MessagesPanel
              messages={messages && partner && user ? messages : undefined}
              error={errorMessages}
              currentUserType="partner"
              currentUserId={partner?.id || ""}
              program={program}
              onSendMessage={async (message) => {
                const createdAt = new Date();

                try {
                  await mutateProgramMessages(
                    async (data) => {
                      const result = await sendMessage({
                        programSlug,
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
                                    partnerId: partner!.id,
                                    text: message,
                                    subject: null,
                                    type: "direct",
                                    readInApp: null,
                                    readInEmail: null,
                                    createdAt,
                                    updatedAt: createdAt,
                                    senderUserId: user!.id,
                                    senderUser: {
                                      id: user!.id,
                                      name: user!.name,
                                      image: user!.image || null,
                                    },
                                    senderPartnerId: partner!.id,
                                    senderPartner: {
                                      id: partner!.id,
                                      name: partner!.name,
                                      image: partner!.image || null,
                                    },
                                  },
                                ],
                              },
                            ]
                          : [],
                      rollbackOnError: true,
                    },
                  );

                  mutatePrefix("/api/partner-profile/messages");
                } catch (e) {
                  console.log("Failed to send message", e);
                  toast.error("Failed to send message");
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Right panel - Profile */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full min-h-0 w-0 overflow-hidden bg-white shadow-lg transition-[width]",
          "@[1082px]/page:shadow-none @[1082px]/page:relative",
          isRightPanelOpen && "w-full sm:w-[400px]",
        )}
      >
        <div className="border-border-subtle flex size-full min-h-0 w-full flex-col border-l sm:w-[400px]">
          <div className="border-border-subtle flex h-12 shrink-0 items-center justify-between gap-4 border-b px-4 sm:h-16 sm:px-6">
            <h2 className="text-content-emphasis text-lg font-semibold leading-7">
              Program
            </h2>
            <div className="flex items-center gap-2">
              <Link href={`/programs/${programSlug}`} target="_blank">
                <Button
                  variant="secondary"
                  text="View program"
                  className="h-8 rounded-lg px-3"
                />
              </Link>
              <button
                type="button"
                onClick={() => setIsRightPanelOpen(false)}
                className="@[1082px]/page:hidden rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          <div className="bg-bg-muted scrollbar-hide flex grow flex-col overflow-y-scroll">
            {programEnrollment && program ? (
              <ProgramInfoPanel programEnrollment={programEnrollment} />
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

function ProgramInfoPanel({
  programEnrollment,
}: {
  programEnrollment: ProgramEnrollmentProps;
}) {
  const program = programEnrollment.program;
  const partnerLink = constructPartnerLink({
    group: programEnrollment.group,
    link: programEnrollment.links?.[0],
  });

  const { data: statsTotals } = usePartnerAnalytics({
    event: "composite",
    interval: "all",
  });

  const [copied, copyToClipboard] = useCopyToClipboard();

  return (
    <>
      {/* Program info */}
      <div className="border-border-subtle relative shrink-0 overflow-hidden border-b">
        <div className="absolute inset-y-0 right-0 w-96 [mask-image:radial-gradient(100%_100%_at_100%_0%,black_30%,transparent)]">
          <Grid cellSize={20} className="text-neutral-200" />
        </div>
        <div className="relative flex flex-col gap-4 p-6">
          <img
            src={program.logo || `${OG_AVATAR_URL}${program.name}`}
            alt={`${program.name} logo`}
            className="size-10 rounded-full"
          />
          <div className="flex flex-col">
            <span className="text-content-emphasis block truncate text-lg font-semibold">
              {program.name}
            </span>
            <span className="text-content-subtle text-sm font-medium">
              Partner since {formatDate(programEnrollment.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Referral link */}
      {programEnrollment.links && programEnrollment.links.length > 0 && (
        <div className="pl-6 pr-6 pt-7">
          <div className="flex items-end justify-between">
            <h3 className="text-content-emphasis text-sm font-semibold">
              Referral link
            </h3>
            <Link
              href={`/programs/${program.slug}/links`}
              target="_blank"
              className="text-sm font-medium text-neutral-500 hover:text-neutral-700"
            >
              View all
            </Link>
          </div>

          <div className="relative mt-2">
            <input
              type="text"
              readOnly
              value={getPrettyUrl(partnerLink)}
              className="text-content-default focus:border-border-emphasis bg-bg-default block h-11 w-full rounded-xl border border-neutral-200 pl-3 pr-12 text-sm focus:outline-none focus:ring-neutral-500"
            />
            {/* Gradient fade overlay */}
            <div className="pointer-events-none absolute right-12 top-1 h-8 w-10 bg-gradient-to-r from-transparent to-white" />
            <button
              type="button"
              onClick={() => {
                copyToClipboard(partnerLink);
                toast.success("Link copied");
              }}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white transition-colors hover:bg-gray-800"
            >
              <div className="relative size-3">
                <div
                  className={cn(
                    "absolute inset-0 transition-[transform,opacity]",
                    copied && "translate-y-1 opacity-0",
                  )}
                >
                  <Copy className="size-3" />
                </div>
                <div
                  className={cn(
                    "absolute inset-0 transition-[transform,opacity]",
                    !copied && "translate-y-1 opacity-0",
                  )}
                >
                  <Check className="size-3" />
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="pl-6 pr-6 pt-7">
        <h3 className="text-content-emphasis text-sm font-semibold">
          Performance
        </h3>
        <div className="divide-border-subtle border-border-subtle mt-2 divide-y rounded-xl border">
          <div className="divide-border-subtle grid grid-cols-3 divide-x">
            {["clicks", "leads", "sales"].map((event) => (
              <div key={event} className="flex flex-col px-3 py-2.5">
                <span className="text-content-subtle text-xs font-medium">
                  {capitalize(event)}
                </span>
                {statsTotals ? (
                  <span className="text-content-emphasis text-sm font-medium">
                    {nFormatter(statsTotals?.[event], { full: true })}
                  </span>
                ) : (
                  <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-200" />
                )}
              </div>
            ))}
          </div>
          <div className="divide-border-subtle grid grid-cols-2 divide-x">
            {[
              { label: "Revenue", value: statsTotals?.saleAmount },
              { label: "Earnings", value: programEnrollment.totalCommissions },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col px-3 py-2.5">
                <span className="text-content-subtle text-xs font-medium">
                  {label}
                </span>
                {value !== undefined ? (
                  <span className="text-content-emphasis text-sm font-medium">
                    {currencyFormatter(value)}
                  </span>
                ) : (
                  <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rewards */}
      <div className="pl-6 pr-6 pt-7">
        <h3 className="text-content-emphasis text-sm font-semibold">Rewards</h3>
        <div className="mt-1">
          <ProgramRewardsPanel
            rewards={programEnrollment.rewards ?? []}
            discount={programEnrollment.discount}
          />
        </div>
      </div>

      {/* Help & support */}
      <div className="border-border-subtle pl-6 pr-6 pt-7">
        <h3 className="text-content-emphasis text-sm font-semibold">
          Help and support
        </h3>
        <div className="mt-1">
          <ProgramHelpLinks />
        </div>
      </div>
    </>
  );
}
