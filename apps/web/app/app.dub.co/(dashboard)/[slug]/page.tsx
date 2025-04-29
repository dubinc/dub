import { PageContent } from "@/ui/layout/page-content";
import WorkspaceLinksClient from "./custom-page-client";
import { LinksTitle } from "./links-title";

export default function WorkspaceLinks() {
  return (
    <PageContent title={<LinksTitle />}>
      <WorkspaceLinksClient />
    </PageContent>
  );
}
