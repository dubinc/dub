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
          "Understand how all your partners are performing and contributing to the success of your partner program.",
        href: "https://dub.co/help/article/managing-program-partners",
      }}
      controls={<CreateGroupButton />}
    >
      <PageWidthWrapper>
        <GroupsTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
