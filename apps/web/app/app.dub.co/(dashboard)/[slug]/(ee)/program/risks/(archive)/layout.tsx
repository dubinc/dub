"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ResolvedRiskEventsFilters } from "./resolved-risk-events-table";
import { RiskHistoryNav } from "./risk-history-nav";

export default function RiskHistoryLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { slug } = useWorkspace();
  const pathname = usePathname();

  const isExpired = pathname.endsWith("/expired");

  return (
    <PageContent
      title={isExpired ? "Expired risk events" : "Resolved risk events"}
      titleBackHref={`/${slug}/program/risks`}
    >
      <PageWidthWrapper>
        <div className="flex flex-col gap-4 pb-10">
          <ResolvedRiskEventsFilters
            status={isExpired ? "expired" : "resolved"}
          />
          <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
            <RiskHistoryNav />
            <div className="border-border-subtle -mx-px -mb-px overflow-hidden rounded-xl border bg-white">
              {children}
            </div>
          </div>
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
