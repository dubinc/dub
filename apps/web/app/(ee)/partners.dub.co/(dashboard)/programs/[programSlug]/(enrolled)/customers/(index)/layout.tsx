"use client";

import { SUBMITTED_LEADS_ENABLED_PROGRAM_IDS } from "@/lib/submitted-leads/constants";
import usePartnerCustomersCount from "@/lib/swr/use-partner-customers-count";
import { usePartnerSubmittedLeadsCount } from "@/lib/swr/use-partner-submitted-leads-count";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { submittedLeadFormSchema } from "@/lib/zod/schemas/submitted-lead-form";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { SubmitLeadSheet } from "@/ui/submitted-leads/submit-lead-sheet";
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
  const [showLeadSheet, setShowLeadSheet] = useState(false);

  const { data: customersCount } = usePartnerCustomersCount<number>({
    includeParams: [],
  });

  const { data: leadsCount } = usePartnerSubmittedLeadsCount<number>({
    ignoreParams: true,
  });

  const leadFormDataRaw = programEnrollment?.program?.referralFormData;
  const programId = programEnrollment?.programId;

  const isEnabled = programId
    ? SUBMITTED_LEADS_ENABLED_PROGRAM_IDS.includes(programId)
    : false;

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
        label: "Leads",
        id: "leads",
        href: "leads",
        info: "Shows your submitted leads.",
        count: leadsCount,
      },
    ];
  }, [isEnabled, customersCount, leadsCount]);

  return (
    <PageContent
      title="Customers"
      controls={
        <>
          {isEnabled && (
            <Button
              text="Submit lead"
              className="h-9 w-fit rounded-lg"
              disabled={!leadFormData}
              disabledTooltip={
                leadFormData ? undefined : "Submitted leads are not offered."
              }
              onClick={() => {
                setShowLeadSheet(true);
              }}
            />
          )}
        </>
      }
    >
      {isEnabled && leadFormData && programEnrollment?.programId && (
        <SubmitLeadSheet
          isOpen={showLeadSheet}
          setIsOpen={setShowLeadSheet}
          programId={programEnrollment.programId}
          leadFormData={leadFormData}
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
