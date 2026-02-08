import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { BountyHeaderTitle } from "./bounty-header";
import { BountyInfo } from "./bounty-info";
import { BountySubmissionsTable } from "./bounty-submissions-table";

export default function Page() {
  return (
    <PageContent title={<BountyHeaderTitle />}>
      <PageWidthWrapper>
        <div className="flex flex-col gap-6">
          <BountyInfo />
          <BountySubmissionsTable />
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
