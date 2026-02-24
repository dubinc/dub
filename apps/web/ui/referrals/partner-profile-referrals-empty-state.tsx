"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { referralFormSchema } from "@/lib/zod/schemas/referral-form";
import { PROGRAM_MARKETPLACE_LOGO_COUNT } from "@/ui/partners/program-marketplace/program-marketplace-logos";
import { SubmitReferralSheet } from "@/ui/referrals/submit-referral-sheet";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useMemo, useState } from "react";
import * as z from "zod/v4";

const EMPTY_STATE_CARDS = [
  {
    logo: 2,
    programName: "Tella",
    name: "John Doe",
    status: "Qualified",
    statusClassName: "text-violet-700 bg-violet-100",
  },
  {
    logo: 7,
    programName: "Fillout",
    name: "John Doe",
    status: "Closed won",
    statusClassName: "text-green-700 bg-green-100",
  },
  {
    logo: 11,
    programName: "Granola",
    name: "John Doe",
    status: "New",
    statusClassName: "text-blue-700 bg-blue-100",
  },
];

export function PartnerProfileReferralsEmptyState() {
  const { programEnrollment } = useProgramEnrollment();
  const [showReferralSheet, setShowReferralSheet] = useState(false);

  const referralFormDataRaw = programEnrollment?.program?.referralFormData;
  const submittedReferralsEnabled = referralFormDataRaw !== null;

  const referralFormData = useMemo(() => {
    if (!referralFormDataRaw) {
      return null;
    }
    try {
      return referralFormSchema.parse(referralFormDataRaw) as z.infer<
        typeof referralFormSchema
      >;
    } catch {
      return null;
    }
  }, [referralFormDataRaw]);

  return (
    <>
      <AnimatedEmptyState
        title={
          submittedReferralsEnabled
            ? "No referrals submitted"
            : "Submitted referrals not offered"
        }
        description={
          submittedReferralsEnabled
            ? "Submit leads and track their progress through the sales process."
            : "You can still earn from regular referrals using your links and codes."
        }
        // TODO: Add "learn more" URLs
        learnMoreHref={
          submittedReferralsEnabled
            ? "https://dub.co/help/article/partner-rewards"
            : "https://dub.co/help/article/partner-rewards"
        }
        addButton={
          submittedReferralsEnabled ? (
            <Button
              type="button"
              text="Submit referral"
              onClick={() => setShowReferralSheet(true)}
              className="h-9 rounded-lg"
            />
          ) : undefined
        }
        cardCount={3}
        cardContent={(index) => {
          const card = EMPTY_STATE_CARDS[index];
          return (
            <div className="flex grow items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="size-8"
                  style={{
                    backgroundImage:
                      "url(https://assets.dub.co/misc/program-marketplace-logos.png)",
                    backgroundSize: `${PROGRAM_MARKETPLACE_LOGO_COUNT * 100}%`,
                    backgroundPositionX:
                      (PROGRAM_MARKETPLACE_LOGO_COUNT -
                        (card.logo % PROGRAM_MARKETPLACE_LOGO_COUNT)) *
                        100 +
                      "%",
                  }}
                />
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
      {referralFormData && programEnrollment?.programId && (
        <SubmitReferralSheet
          isOpen={showReferralSheet}
          setIsOpen={setShowReferralSheet}
          programId={programEnrollment.programId}
          referralFormData={referralFormData}
        />
      )}
    </>
  );
}
