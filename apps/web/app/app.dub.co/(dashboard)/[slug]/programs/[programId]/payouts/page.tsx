import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PayoutStats } from "./payout-stats";
import { PayoutTable } from "./payout-table";

export default async function ProgramPayoutsPage({
  params,
}: {
  params: { slug: string; programId: string };
}) {
  const { programId } = params;

  return (
    <PageContent title="Payouts">
      <MaxWidthWrapper>
        <PayoutStats programId={programId} />
        <div className="mt-6">
          <PayoutTable programId={programId} />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
