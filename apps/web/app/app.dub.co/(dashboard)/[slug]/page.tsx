import { PageContent } from "@/ui/layout/page-content";
import { LinksTitle } from "./links-title";
import WorkspaceLinksClient from "./page-client";

export default function WorkspaceLinks() {
  return (
    <PageContent title={<LinksTitle />}>
      <WorkspaceLinksClient />
    </PageContent>
  );
}
