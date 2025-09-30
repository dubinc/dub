import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { FolderMembersPageClient } from "./page-client";

export default async function FolderMembersPage(
  props: {
    params: Promise<{ folderId: string }>;
  }
) {
  const params = await props.params;
  const { folderId } = params;

  return (
    <PageContent
      title="Folder Permissions"
      titleInfo={{
        title:
          "Learn how to set role-based access control for your folders to limit access to links for select teammates.",
        href: "https://dub.co/help/article/folders-rbac",
      }}
    >
      <PageWidthWrapper className="grid gap-4">
        <FolderMembersPageClient folderId={folderId} />
      </PageWidthWrapper>
    </PageContent>
  );
}
