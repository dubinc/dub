import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { Suspense } from "react";
import WorkspaceUtmTemplatesClient, { UTMPageControls } from "./page-client";

export default function WorkspaceUtmTemplates() {
  return (
    <PageContent
      title="UTM Templates"
      titleInfo={{
        title:
          "Learn how to create UTM templates on Dub to streamline UTM campaign management across your team.",
        href: "https://dub.co/help/article/how-to-create-utm-templates",
      }}
      controls={<UTMPageControls />}
    >
      <PageWidthWrapper>
        <Suspense>
          <WorkspaceUtmTemplatesClient />
        </Suspense>
      </PageWidthWrapper>
    </PageContent>
  );
}
