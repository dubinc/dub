import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { FraudEventStats } from "./fraud-event-stats";
import { FraudEventTable } from "./fraud-event-table";

export default function ProgramFraudRiskPage() {
  return (
    <PageContent
      title="Fraud & Risk"
      titleInfo={{
        title:
          "Discover fraudulent referrals, suspicious partner traffic, and other partner risks to keep your program running smooth.",
        href: "https://dub.co/help/article/fraud-and-risk",
      }}
    >
      <PageWidthWrapper>
        <FraudEventStats />
        <div className="mt-6">
          <FraudEventTable />
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
