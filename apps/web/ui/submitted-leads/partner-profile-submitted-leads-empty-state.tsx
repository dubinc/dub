"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { submittedLeadFormSchema } from "@/lib/zod/schemas/submitted-lead-form";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SubmitLeadSheet } from "@/ui/submitted-leads/submit-lead-sheet";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useMemo, useState } from "react";
import * as z from "zod/v4";

const EMPTY_STATE_CARDS = [
  {
    logoSrc: "https://assets.dub.co/cms/logo-nvidia.svg",
    programName: "Nvidia",
    name: "Noah Thompson",
    status: "New",
    statusClassName: "bg-blue-100 text-blue-700",
  },
  {
    logoSrc: "https://assets.dub.co/cms/logo-openai.svg",
    programName: "OpenAI",
    name: "Ava Robinson",
    status: "Qualified",
    statusClassName: "bg-violet-100 text-violet-700",
  },
  {
    logoSrc: "https://assets.dub.co/cms/logo-google.svg",
    programName: "Google",
    name: "Sophie Carter",
    status: "New",
    statusClassName: "bg-blue-100 text-blue-700",
  },
  {
    logoSrc: "https://assets.dub.co/cms/logo-microsoft.svg",
    programName: "Microsoft",
    name: "Chloe Scott",
    status: "Closed won",
    statusClassName: "bg-green-100 text-green-700",
  },
  {
    logoSrc: "https://assets.dub.co/cms/logo-meta.svg",
    programName: "Meta",
    name: "Liam Johnson",
    status: "Qualified",
    statusClassName: "bg-violet-100 text-violet-700",
  },
  {
    logoSrc: "https://assets.dub.co/cms/logo-slack.svg",
    programName: "Slack",
    name: "Oliver Green",
    status: "New",
    statusClassName: "bg-blue-100 text-blue-700",
  },
  {
    logoSrc: "https://assets.dub.co/cms/logo-netflix.svg",
    programName: "Netflix",
    name: "Ella Martinez",
    status: "Closed won",
    statusClassName: "bg-green-100 text-green-700",
  },
  {
    logoSrc: "https://assets.dub.co/cms/logo-apple.svg",
    programName: "Apple",
    name: "Amelia Adams",
    status: "Qualified",
    statusClassName: "bg-violet-100 text-violet-700",
  },
];

export function PartnerProfileSubmittedLeadsEmptyState() {
  const { programEnrollment } = useProgramEnrollment();
  const [showLeadSheet, setShowLeadSheet] = useState(false);

  const leadFormDataRaw = programEnrollment?.program?.referralFormData;
  const submittedLeadsEnabled = leadFormDataRaw !== null;

  const leadFormData = useMemo(() => {
    if (!leadFormDataRaw) {
      return null;
    }
    try {
      return submittedLeadFormSchema.parse(leadFormDataRaw) as z.infer<
        typeof submittedLeadFormSchema
      >;
    } catch {
      return null;
    }
  }, [leadFormDataRaw]);

  return (
    <>
      <AnimatedEmptyState
        title={
          submittedLeadsEnabled
            ? "No leads submitted"
            : "Submitted leads not offered"
        }
        description={
          submittedLeadsEnabled
            ? "Submit leads and track their progress through the sales process."
            : "You can still earn from regular referrals using your links and codes."
        }
        learnMoreHref="https://dub.co/help/article/submitted-referrals"
        addButton={
          submittedLeadsEnabled ? (
            <Button
              type="button"
              text="Submit lead"
              onClick={() => setShowLeadSheet(true)}
              className="h-9 rounded-lg"
            />
          ) : undefined
        }
        cardCount={EMPTY_STATE_CARDS.length}
        cardContent={(index) => {
          const card = EMPTY_STATE_CARDS[index];
          return (
            <div className="flex grow items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white">
                  <img
                    alt={`${card.programName} logo`}
                    src={card.logoSrc}
                    className="size-full object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="text-content-default text-sm font-semibold">
                    {card.programName}
                  </div>
                  <div className="text-content-subtle text-xs font-medium">
                    {card.name}
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "text-content-subtle flex h-5 items-center rounded-md px-2 text-xs font-medium",
                  card.statusClassName,
                )}
              >
                {card.status}
              </div>
            </div>
          );
        }}
        cardContainerClassName="max-w-96"
        cardClassName="rounded-xl"
      />
      {leadFormData && programEnrollment?.programId && (
        <SubmitLeadSheet
          isOpen={showLeadSheet}
          setIsOpen={setShowLeadSheet}
          programId={programEnrollment.programId}
          leadFormData={leadFormData}
        />
      )}
    </>
  );
}
