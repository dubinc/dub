import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnerSettingsNotificationsPageClient } from "./page-client";

export default function PartnerSettingsNotificationsPage() {
  return (
    <PageContent
      title="Notifications"
      titleInfo={{
        title:
          "Adjust your personal notification preferences and choose which updates you want to receive. These settings will only be applied to your personal account.",
      }}
    >
      <PageWidthWrapper>
        <PartnerSettingsNotificationsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
