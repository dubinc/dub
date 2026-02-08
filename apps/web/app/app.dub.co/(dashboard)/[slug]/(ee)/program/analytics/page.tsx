"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import WorkspaceExceededEvents from "@/ui/workspaces/workspace-exceeded-events";
import { ProgramAnalyticsPageClient } from "./page-client";

export default function ProgramAnalytics() {
  return (
    <PageContent
      title="Analytics"
      titleInfo={{
        title:
          "Learn how to use Dub to track and measure your program's performance.",
        href: "https://dub.co/help/article/program-analytics",
      }}
    >
      <PageWidthWrapper>
        <ProgramAnalyticsPageWrapper />
      </PageWidthWrapper>
    </PageContent>
  );
}

function ProgramAnalyticsPageWrapper() {
  const { exceededEvents } = useWorkspace();

  if (exceededEvents) {
    return <WorkspaceExceededEvents />;
  }

  return <ProgramAnalyticsPageClient />;
}
