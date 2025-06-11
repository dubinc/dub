import { FolderSwitcher } from "@/ui/folders/folder-switcher";
import { PageContent } from "@/ui/layout/page-content";
import WorkspaceLinksClient, {
  WorkspaceLinksPageControls,
} from "./page-client";

export default function WorkspaceLinks() {
  return (
    <PageContent
      title={<FolderSwitcher />}
      controls={<WorkspaceLinksPageControls />}
    >
      <WorkspaceLinksClient />
    </PageContent>
  );
}
