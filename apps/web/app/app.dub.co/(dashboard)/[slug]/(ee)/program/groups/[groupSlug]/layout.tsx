import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { GroupHeaderTabs, GroupHeaderTitle } from "./group-header";

export default function GroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageContent
      title={<GroupHeaderTitle />}
      headerContent={<GroupHeaderTabs />}
    >
      <PageWidthWrapper className="pb-10">{children}</PageWidthWrapper>
    </PageContent>
  );
}
