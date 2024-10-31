import { PartnerStats } from "./stats";

export default function ProgramPartners({
  params,
}: {
  params: { slug: string; programId: string };
}) {
  const { programId } = params;

  return (
    <div className="mt-8 space-y-10">
      <PartnerStats programId={programId} />
    </div>
  );
}
