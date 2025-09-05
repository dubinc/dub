"use client";

import { markProgramMessagesReadAction } from "@/lib/actions/partners/mark-program-messages-read";
import { messageProgramAction } from "@/lib/actions/partners/message-program";
import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import { usePartnerEarningsTimeseries } from "@/lib/swr/use-partner-earnings-timeseries";
import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { useProgramMessages } from "@/lib/swr/use-program-messages";
import useUser from "@/lib/swr/use-user";
import { PayoutsCount, ProgramEnrollmentProps } from "@/lib/types";
import { useMessagesContext } from "@/ui/messages/messages-context";
import { MessagesPanel } from "@/ui/messages/messages-panel";
import { ToggleSidePanelButton } from "@/ui/messages/toggle-side-panel-button";
import { ProgramHelpLinks } from "@/ui/partners/program-help-links";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
import { X } from "@/ui/shared/icons";
import { PayoutStatus } from "@dub/prisma/client";
import { Button, Grid, useCopyToClipboard } from "@dub/ui";
import { Check, ChevronLeft, Copy, LoadingSpinner } from "@dub/ui/icons";
import {
  OG_AVATAR_URL,
  capitalize,
  cn,
  currencyFormatter,
  formatDate,
  getPrettyUrl,
} from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";

export function PartnerMessagesProgramPageClient() {
  const { programSlug } = useParams() as { programSlug: string };
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
    swrOpts: {
      onSuccess: (data) => {
        // Mark unread messages from the program as read
        if (
          !isMarkingProgramMessagesRead &&
          data?.[0]?.messages?.some(
            (message) => !message.senderPartnerId && !message.readInApp,
          )
        )
          markProgramMessagesRead({
            programSlug,
          });
      },
    },
  });
  const messages = programMessages?.[0]?.messages;

  const { executeAsync: sendMessage } = useAction(messageProgramAction);

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
            messages={messages && partner && user ? messages : undefined}
            error={errorMessages}
            currentUserType="partner"
            currentUserId={partner?.id || ""}
            programImage={program?.logo}
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

                                  emailId: null,
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
    program,
    linkKey: programEnrollment.links?.[0]?.key,
  });

  const { data: statsTotals } = usePartnerAnalytics({
    event: "composite",
    interval: "all",
  });

  const { data: earningsTimeseries } = usePartnerEarningsTimeseries({
    interval: "all",
  });

  const totalEarnings = useMemo(
    () => earningsTimeseries?.reduce((acc, { earnings }) => acc + earnings, 0),
    [earningsTimeseries],
  );

  const { payoutsCount } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  const totalPayouts = useMemo(
    () =>
      payoutsCount
        ?.filter(
          (payout) =>
            payout.status === PayoutStatus.processed ||
            payout.status === PayoutStatus.sent ||
            payout.status === PayoutStatus.completed,
        )
        ?.reduce((acc, p) => acc + p.amount, 0) ?? 0,
    [payoutsCount],
  );

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
            className="size-12 rounded-full"
          />
          <div>
            <span className="text-content-emphasis block text-lg font-semibold">
              {program.name}
            </span>
            <span className="text-content-subtle text-sm font-medium">
              Partner since {formatDate(programEnrollment.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Referral link */}
      <div className="border-border-subtle border-b p-6">
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

        <input
          type="text"
          readOnly
          value={getPrettyUrl(partnerLink)}
          className="border-border-default text-content-default focus:border-border-emphasis bg-bg-default mt-2 block h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-neutral-500"
        />

        <Button
          icon={
            <div className="relative size-4">
              <div
                className={cn(
                  "absolute inset-0 transition-[transform,opacity]",
                  copied && "translate-y-1 opacity-0",
                )}
              >
                <Copy className="size-4" />
              </div>
              <div
                className={cn(
                  "absolute inset-0 transition-[transform,opacity]",
                  !copied && "translate-y-1 opacity-0",
                )}
              >
                <Check className="size-4" />
              </div>
            </div>
          }
          text={copied ? "Copied link" : "Copy link"}
          className="mt-3 h-8 rounded-lg"
          onClick={() => copyToClipboard(partnerLink)}
        />
      </div>

      {/* Rewards */}
      <div className="border-border-subtle border-b p-6">
        <h3 className="text-content-emphasis text-sm font-semibold">Rewards</h3>
        <ProgramRewardList
          rewards={programEnrollment.rewards ?? []}
          discount={programEnrollment.discount}
          className="mt-2"
        />
      </div>

      {/* Stats */}
      <div className="border-border-subtle border-b p-6">
        <h3 className="text-content-emphasis text-sm font-semibold">Stats</h3>
        <div className="divide-border-subtle border-border-subtle mt-2 divide-y rounded-lg border">
          <div className="divide-border-subtle grid grid-cols-3 divide-x">
            {["clicks", "leads", "sales"].map((event) => (
              <div key={event} className="flex flex-col gap-1 p-3">
                <span className="text-content-subtle text-xs font-medium">
                  {capitalize(event)}
                </span>
                {statsTotals ? (
                  <span className="text-content-emphasis text-sm font-medium">
                    {statsTotals?.[event]}
                  </span>
                ) : (
                  <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-200" />
                )}
              </div>
            ))}
          </div>
          <div className="divide-border-subtle grid grid-cols-2 divide-x">
            {[
              { label: "Earnings", value: totalEarnings },
              { label: "Payouts", value: totalPayouts },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1 p-3">
                <span className="text-content-subtle text-xs font-medium">
                  {label}
                </span>
                {value !== undefined ? (
                  <span className="text-content-emphasis text-sm font-medium">
                    {currencyFormatter(value / 100)}
                  </span>
                ) : (
                  <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Help & support */}
      <div className="border-border-subtle border-b p-6">
        <h3 className="text-content-emphasis text-sm font-semibold">
          Help and support
        </h3>
        <div className="border-border-subtle mt-2 rounded-lg border p-2">
          <ProgramHelpLinks />
        </div>
      </div>
    </>
  );
}
