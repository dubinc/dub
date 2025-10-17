import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { Suspense } from "react";
import { ConversionTrackingToggle } from "./conversion-tracking-toggle";
import WorkspaceAnalyticsPageClient from "./page-client";

export default function WorkspaceAnalyticsPage() {
  return (
    <PageContent
      title="Analytics"
      titleInfo={{
        title:
          "Configure analytics and conversion tracking settings for your workspace.",
        href: "https://dub.co/docs/conversions/quickstart",
      }}
      controls={<ConversionTrackingToggle />}
    >
      <PageWidthWrapper className="max-w-[800px] pb-20">
        <Suspense>
          <WorkspaceAnalyticsPageClient />
        </Suspense>
      </PageWidthWrapper>
    </PageContent>
  );
}
