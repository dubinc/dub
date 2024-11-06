import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PayoutStats } from "./payout-stats";
import { PayoutTable } from "./payout-table";

export default function ProgramPayoutsPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <PageContent title="Payouts">
      <MaxWidthWrapper>
        <PayoutStats />
        <div className="mt-6">
          <PayoutTable />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
