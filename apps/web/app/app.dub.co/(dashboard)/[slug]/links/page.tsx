import { FolderSwitcher } from "@/ui/folders/folder-switcher";
import { PageContentOld } from "@/ui/layout/page-content";
import WorkspaceLinksClient from "./page-client";

export default function WorkspaceLinks() {
  return (
    <PageContentOld title={<FolderSwitcher />}>
      <WorkspaceLinksClient />
    </PageContentOld>
  );
}
