import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { ProgramOverview } from "./overview";
import { PendingPartners } from "./pending-partners";
import { PendingPayouts } from "./pending-payouts";

export default async function ProgramOverviewPage({
  params,
}: {
  params: { slug: string; programId: string };
}) {
  const { programId } = params;

  // TODO:
  // Add suspense loader

  return (
    <PageContent title="Overview">
      <MaxWidthWrapper>
        <div className="mt-8 space-y-10">
          <ProgramOverview programId={programId} />
          <div className="flex flex-col gap-10 sm:flex-row">
            <div className="basis-1/2">
              <PendingPartners />
            </div>
            <div className="basis-1/2">
              <PendingPayouts />
            </div>
          </div>
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
