import { PageContent } from "@/ui/layout/page-content";
import { ProfileSettingsPageClient } from "./page-client";

export default function ProfileSettingsPage() {
  return (
    <PageContent
      title="Profile"
      description="This partner profile is shared with program owners when you apply to their programs."
      hideReferButton
    >
      <ProfileSettingsPageClient />
    </PageContent>
  );
}
