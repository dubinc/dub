import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { GroupHeader } from "./group-header";
import { GroupSettings } from "./group-settings";

export default function ProgramPartnersGroup() {
  return (
    <PageContent title={<GroupHeader />}>
      <PageWidthWrapper>
        <GroupSettings />
      </PageWidthWrapper>
    </PageContent>
  );
}
