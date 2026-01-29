"use client";

import { REFERRAL_ENABLED_PROGRAM_IDS } from "@/lib/referrals/constants";
import useCustomersCount from "@/lib/swr/use-customers-count";
import { useProgramReferralsCount } from "@/lib/swr/use-program-referrals-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { InfoTooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CSSProperties, ReactNode, useMemo } from "react";

export default function PartnerCustomersLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { slug, defaultProgramId } = useWorkspace();

  const { data: customersCount } = useCustomersCount<number>({
    includeParams: [],
  });

  const { data: referralsCount } = useProgramReferralsCount<number>({
    ignoreParams: true,
  });

  const isEnabled = defaultProgramId
    ? REFERRAL_ENABLED_PROGRAM_IDS.includes(defaultProgramId)
    : false;

  const tabs = useMemo(() => {
    if (!isEnabled) {
      return [];
    }

    return [
      {
        label: "Customers",
        id: "customers",
        href: "",
        info: "Shows both converted and non-converted customers.",
        count: customersCount,
      },
      {
        label: "Partner Referrals",
        id: "invited",
        href: "referrals",
        info: "Shows your partners' submitted referrals.",
        count: referralsCount,
      },
    ];
  }, [isEnabled, customersCount, referralsCount]);

  return (
    <PageContent
      title="Customers"
      titleInfo={{
        title:
          "Get deeper, real-time insights about your referred customers' demographics, purchasing behavior, and lifetime value (LTV).",
        href: "https://dub.co/help/article/customer-insights",
      }}
    >
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
                  href={`/${slug}/program/customers${tab.href ? `/${tab.href}` : ""}`}
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
                      {tab.count.toLocaleString()}
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
