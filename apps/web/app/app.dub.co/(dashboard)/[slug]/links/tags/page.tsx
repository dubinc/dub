import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { Suspense } from "react";
import WorkspaceTagsClient, { TagsPageControls } from "./page-client";

export default function TagsPage() {
  return (
    <PageContent
      title="Tags"
      titleInfo={{
        title:
          "Learn how to use tags to organize your links and retrieve analytics for them.",
        href: "https://dub.co/help/article/how-to-use-tags",
      }}
      controls={<TagsPageControls />}
    >
      <PageWidthWrapper>
        <Suspense>
          <WorkspaceTagsClient />
        </Suspense>
      </PageWidthWrapper>
    </PageContent>
  );
}
