import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { GroupHeaderTabs, GroupHeaderTitle } from "../group-header";
import { GroupDiscount } from "./group-discount";

export default function ProgramPartnersGroupDiscount() {
  return (
    <PageContent
      title={<GroupHeaderTitle />}
      headerContent={<GroupHeaderTabs />}
    >
      <PageWidthWrapper>
        <GroupDiscount />
      </PageWidthWrapper>
    </PageContent>
  );
}
