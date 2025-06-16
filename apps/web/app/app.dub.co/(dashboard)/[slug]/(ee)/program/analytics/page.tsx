"use client";

import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramAnalyticsPageClient } from "./page-client";

export default function ProgramAnalytics() {
  return (
    <PageContent title="Analytics">
      <PageWidthWrapper>
        <ProgramAnalyticsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
