"use client";

import { REFERRAL_ENABLED_PROGRAM_IDS } from "@/lib/referrals/constants";
import usePartnerCustomersCount from "@/lib/swr/use-partner-customers-count";
import usePartnerReferralsCount from "@/lib/swr/use-partner-referrals-count";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { referralFormSchema } from "@/lib/zod/schemas/referral-form";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { SubmitReferralSheet } from "@/ui/referrals/submit-referral-sheet";
import { Button, InfoTooltip } from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { CSSProperties, ReactNode, useMemo, useState } from "react";
import * as z from "zod/v4";

export default function PartnerCustomersLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { programEnrollment } = useProgramEnrollment();
  const { programSlug } = useParams<{ programSlug: string }>();
  const [showReferralSheet, setShowReferralSheet] = useState(false);

  const { data: customersCount } = usePartnerCustomersCount<number>({
    includeParams: [],
  });

  const { data: referralsCount } = usePartnerReferralsCount<number>({
    includeParams: [],
  });

  const referralFormDataRaw = programEnrollment?.program?.referralFormData;
  const programId = programEnrollment?.programId;

  const isEnabled = programId
    ? REFERRAL_ENABLED_PROGRAM_IDS.includes(programId)
    : false;

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

  const tabs = useMemo(() => {
    if (!isEnabled) {
      return [];
    }

    return [
      {
        label: "Customers",
        id: "customers",
        href: "",
        info: "Shows both your converted and non-converted customers.",
        count: customersCount,
      },
      {
        label: "Submitted Referrals",
        id: "invited",
        href: "referrals",
        info: "Shows your submitted referrals and their status.",
        count: referralsCount,
      },
    ];
  }, [isEnabled, customersCount, referralsCount]);

  return (
    <PageContent
      title="Customers"
      controls={
        <>
          {isEnabled && (
            <Button
              text="Submit referral"
              className="h-9 w-fit rounded-lg"
              disabled={!referralFormData}
              disabledTooltip={
                referralFormData
                  ? undefined
                  : "Submitted referrals are not offered."
              }
              onClick={() => {
                setShowReferralSheet(true);
              }}
            />
          )}
        </>
      }
    >
      {isEnabled && referralFormData && programEnrollment?.programId && (
        <SubmitReferralSheet
          isOpen={showReferralSheet}
          setIsOpen={setShowReferralSheet}
          programId={programEnrollment.programId}
          referralFormData={referralFormData}
        />
      )}

      <PageWidthWrapper className="flex flex-col gap-3 pb-10">
        {tabs.length > 0 && (
          <div
            className={cn(
              "grid grid-cols-[repeat(var(--tabs),minmax(0,1fr))] gap-2",
            )}
            style={{ "--tabs": tabs.length } as CSSProperties}
          >
            {tabs.map((tab) => {
              const isActive = pathname.endsWith(
                `/customers${tab.href ? `/${tab.href}` : ""}`,
              );

              return (
                <Link
                  key={tab.id}
                  href={`/programs/${programSlug}/customers${tab.href ? `/${tab.href}` : ""}`}
                  className={cn(
                    "border-border-subtle flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors duration-100",
                    isActive
                      ? "border-black ring-1 ring-black"
                      : "hover:bg-bg-muted",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-content-default text-xs font-semibold">
                      {tab.label}
                    </span>
                    {tab.info && <InfoTooltip content={tab.info} />}
                  </div>
                  {tab.count !== undefined ? (
                    <span className="text-content-emphasis text-base font-semibold">
                      {nFormatter(tab.count, { full: true })}
                    </span>
                  ) : (
                    <div className="h-6 w-12 animate-pulse rounded-md bg-neutral-200" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
        {children}
      </PageWidthWrapper>
    </PageContent>
  );
}
