import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { Suspense } from "react";
import WorkspaceTagsClient, { TagsPageControls } from "./page-client";

export default function TagsPage() {
  return (
    <PageContent title="Tags" controls={<TagsPageControls />}>
      <PageWidthWrapper>
        <Suspense>
          <WorkspaceTagsClient />
        </Suspense>
      </PageWidthWrapper>
    </PageContent>
  );
}
