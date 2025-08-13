import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { GroupHeaderTabs, GroupHeaderTitle } from "../group-header";
import { GroupRewards } from "./group-rewards";

export default function ProgramPartnersGroupRewards() {
  return (
    <PageContent
      title={<GroupHeaderTitle />}
      headerContent={<GroupHeaderTabs />}
    >
      <PageWidthWrapper>
        <GroupRewards />
      </PageWidthWrapper>
    </PageContent>
  );
}
