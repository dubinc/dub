import { PageContent } from "@/ui/layout/page-content";

import { PartnersDashboardPageClient } from "./page-client";

export default function PartnersDashboard() {
  return (
    <PageContent title="Programs" hideReferButton>
      <PartnersDashboardPageClient />
    </PageContent>
  );
}
