import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import WorkspaceSettingsClient from "./page-client";

export default function WorkspaceSettings() {
  return (
    <PageContent title="General">
      <PageWidthWrapper>
        <WorkspaceSettingsClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
