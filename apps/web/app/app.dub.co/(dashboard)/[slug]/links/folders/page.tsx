import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { FoldersPageClient, FoldersPageControls } from "./page-client";

export default async function FoldersPage() {
  return (
    <PageContent title="Folders" controls={<FoldersPageControls />}>
      <PageWidthWrapper>
        <FoldersPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
