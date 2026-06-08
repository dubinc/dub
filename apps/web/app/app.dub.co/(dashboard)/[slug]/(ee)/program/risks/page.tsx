import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { RiskCenterMenu } from "./risk-center-menu";
import { RiskEventsTable } from "./risk-events-table";
import { RiskSignalsButton } from "./risk-signals-button";

export default function RiskCenterPage() {
  return (
    <PageContent
      title="Risk Center"
      titleInfo={{
        title:
          "Safeguard your partner program by automatically flagging, reviewing, and resolving potential risk signals.",
        href: "https://dub.co/help/article/fraud-detection",
      }}
      controls={
        <>
          <RiskSignalsButton />
          <RiskCenterMenu />
        </>
      }
    >
      <PageWidthWrapper>
        <RiskEventsTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
