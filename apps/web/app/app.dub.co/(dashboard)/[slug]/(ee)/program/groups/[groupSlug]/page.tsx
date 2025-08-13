import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { GroupHeaderTabs, GroupHeaderTitle } from "./group-header";
import { GroupPartners } from "./group-partners";
import { GroupSettings } from "./group-settings";

export default function ProgramPartnersGroup() {
  return (
    <PageContent
      title={<GroupHeaderTitle />}
      headerContent={<GroupHeaderTabs />}
    >
      <PageWidthWrapper>
        <div className="flex flex-col gap-6">
          <GroupSettings />
          <GroupPartners />
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
