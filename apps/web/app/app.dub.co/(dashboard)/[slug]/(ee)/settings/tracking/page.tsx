import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { Suspense } from "react";
import { ConfigureTrackingSection } from "./configure-tracking-section";
import { ConversionTrackingToggle } from "./conversion-tracking-toggle";
import { InstallationSection } from "./installation-section";

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
      <PageWidthWrapper className="pb-20">
        <Suspense>
          <div className="flex flex-1 flex-col gap-8 overflow-hidden">
            <ConfigureTrackingSection />
            <InstallationSection />
          </div>
        </Suspense>
      </PageWidthWrapper>
    </PageContent>
  );
}
