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
    <div className="space-y-10">
      <ProgramOverview programId={programId} />
      <div className="flex gap-10">
        <div className="basis-1/2">
          <PendingPartners />
        </div>
        <div className="basis-1/2">
          <PendingPayouts />
        </div>
      </div>
    </div>
  );
}
