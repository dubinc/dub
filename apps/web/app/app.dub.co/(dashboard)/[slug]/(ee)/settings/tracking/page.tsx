import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { Suspense } from "react";
import { ConversionTrackingToggle } from "./conversion-tracking-toggle";
import { WorkspaceTrackingSettingsPageClient } from "./page-client";

export default function WorkspaceTrackingSettingsPage() {
  return (
    <PageContent
      title="Tracking"
      titleInfo={{
        title:
          "Configure and install Dub's tracking scripts and start tracking conversions on your website and web applications.",
        href: "https://dub.co/docs/concepts/attribution",
      }}
      controls={<ConversionTrackingToggle />}
    >
      <PageWidthWrapper className="max-w-[800px] pb-20">
        <Suspense>
          <WorkspaceTrackingSettingsPageClient />
        </Suspense>
      </PageWidthWrapper>
    </PageContent>
  );
}
