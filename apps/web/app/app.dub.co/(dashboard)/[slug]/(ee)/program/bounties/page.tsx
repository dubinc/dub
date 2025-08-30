import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { BountyList } from "./bounty-list";
import { CreateBountyButton } from "./create-bounty-button";

export default function Page() {
  return (
    <PageContent
      title="Bounties"
      // TODO: add title info & href
      controls={<CreateBountyButton />}
    >
      <PageWidthWrapper>
        <BountyList />
      </PageWidthWrapper>
    </PageContent>
  );
}
