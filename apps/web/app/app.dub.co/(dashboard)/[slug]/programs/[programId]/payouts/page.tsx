import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PayoutsList } from "./payout-list";
import { PayoutStats } from "./stats";

export default async function ProgramPayoutsPage({
  params,
}: {
  params: { slug: string; programId: string };
}) {
  const { programId } = params;

  return (
    <PageContent title="Payouts">
      <MaxWidthWrapper>
        <div className="mt-8 space-y-10">
          <PayoutStats programId={programId} />
          <PayoutsList programId={programId} />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
