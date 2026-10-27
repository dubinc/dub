import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { BountyList } from "./bounty-list";
import { CreateBountyButton } from "./create-bounty-button";

export default function Page() {
  return (
    <PageContent
      title="Bounties"
      titleInfo={{
        title:
          "Drive partner engagement by creating performance and submission bounties for your partner program.",
        href: "https://dub.co/help/article/program-bounties",
      }}
      controls={<CreateBountyButton />}
    >
      <PageWidthWrapper className="pb-10">
        <BountyList />
      </PageWidthWrapper>
    </PageContent>
  );
}
