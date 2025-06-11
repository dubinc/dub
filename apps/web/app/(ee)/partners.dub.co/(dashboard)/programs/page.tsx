import { PageContentOld } from "@/ui/layout/page-content";

import { PartnersDashboardPageClient } from "./page-client";

export default function PartnersDashboard() {
  return (
    <PageContentOld title="Programs" showControls>
      <PartnersDashboardPageClient />
    </PageContentOld>
  );
}
