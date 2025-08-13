import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { GroupHeader } from "../group-header";
import { GroupDiscount } from "./group-discount";

export default function ProgramPartnersGroupDiscount() {
  return (
    <PageContent title={<GroupHeader />}>
      <PageWidthWrapper>
        <GroupDiscount />
      </PageWidthWrapper>
    </PageContent>
  );
}
