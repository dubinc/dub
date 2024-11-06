import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PartnerStats } from "./partner-stats";
import { PartnerTable } from "./partner-table";

export default function ProgramPartners() {
  return (
    <PageContent title="Partners">
      <MaxWidthWrapper>
        <PartnerStats />
        <div className="mt-6">
          <PartnerTable />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
