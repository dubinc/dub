import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { FoldersPageClient, FoldersPageControls } from "./page-client";

export default async function FoldersPage() {
  return (
    <PageContent
      title="Folders"
      titleInfo={{
        title:
          "Learn how to use folders to organize and manage access to your links with fine-grained role-based access controls.",
        href: "https://dub.co/help/article/link-folders",
      }}
      controls={<FoldersPageControls />}
    >
      <PageWidthWrapper>
        <FoldersPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
