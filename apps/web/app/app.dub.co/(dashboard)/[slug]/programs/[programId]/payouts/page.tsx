import { PayoutList } from "./payout-list";
import { PayoutStats } from "./stats";

export default async function ProgramPayoutsPage({
  params,
}: {
  params: { slug: string; programId: string };
}) {
  const { programId } = params;

  return (
    <div className="mt-8 space-y-10">
      <PayoutStats programId={programId} />
      <PayoutList programId={programId} />
    </div>
  );
}
