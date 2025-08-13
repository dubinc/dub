import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { GroupHeader } from "../group-header";
import { GroupRewards } from "./rewards";

export default function ProgramPartnersGroupRewards() {
  return (
    <PageContent title={<GroupHeader />}>
      <PageWidthWrapper>
        <GroupRewards />
      </PageWidthWrapper>
    </PageContent>
  );
}
