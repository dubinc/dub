import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { Suspense } from "react";
import WorkspaceUtmTemplatesClient, { UTMPageControls } from "./page-client";

export default function WorkspaceUtmTemplates() {
  return (
    <PageContent title="UTM Templates" controls={<UTMPageControls />}>
      <PageWidthWrapper>
        <Suspense>
          <WorkspaceUtmTemplatesClient />
        </Suspense>
      </PageWidthWrapper>
    </PageContent>
  );
}
