import { PageContentOld } from "@/ui/layout/page-content";
import { ResourcesPageClient } from "./page-client";

export default function ResourcesPage() {
  return (
    <PageContentOld title="Resources" showControls>
      <ResourcesPageClient />
    </PageContentOld>
  );
}
