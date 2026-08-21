"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { RiskHistoryNav } from "./risk-history-nav";

export default function RiskHistoryLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { slug } = useWorkspace();
  const pathname = usePathname();

  const title = pathname.endsWith("/expired")
    ? "Expired risk events"
    : "Resolved risk events";

  return (
    <PageContent title={title} titleBackHref={`/${slug}/program/risks`}>
      <PageWidthWrapper>
        <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
          <RiskHistoryNav />
          <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white p-4">
            {children}
          </div>
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
