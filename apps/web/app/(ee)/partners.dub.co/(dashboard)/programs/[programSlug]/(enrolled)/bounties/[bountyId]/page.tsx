import { PageContent } from "@/ui/layout/page-content";
import {
  PartnerBountyPageClient,
  PartnerBountyPageHeader,
} from "./page-client";

export default function PartnerBountyPage() {
  return (
    <PageContent title={<PartnerBountyPageHeader />}>
      <PartnerBountyPageClient />
    </PageContent>
  );
}
