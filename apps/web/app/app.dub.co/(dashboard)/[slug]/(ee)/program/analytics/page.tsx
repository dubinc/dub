"use client";

import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramAnalyticsPageClient } from "./page-client";

export default function ProgramAnalytics() {
  return (
    <PageContent
      title="Analytics"
      titleInfo={{
        title:
          "Learn how to use Dub Analytics to track and measure your program's performance.",
        href: "https://dub.co/help/article/program-analytics",
      }}
    >
      <PageWidthWrapper>
        <ProgramAnalyticsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
