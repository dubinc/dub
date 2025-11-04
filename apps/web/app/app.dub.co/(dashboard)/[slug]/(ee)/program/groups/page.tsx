import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { CreateGroupButton } from "./create-group-button";
import { GroupsTable } from "./groups-table";

export default function ProgramPartnersGroups() {
  return (
    <PageContent
      title="Groups"
      titleInfo={{
        title:
          "Learn how you can create partner groups to segment partners by rewards, discounts, performance, location, and more.",
        href: "https://dub.co/help/article/partner-groups",
      }}
      controls={<CreateGroupButton />}
    >
      <PageWidthWrapper>
        <GroupsTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
