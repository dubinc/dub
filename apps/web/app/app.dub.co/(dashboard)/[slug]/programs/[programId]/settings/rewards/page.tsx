import { DeleteProgram } from "../delete-program";
import { ProgramSettings } from "../program-settings";
import { TrackingSettings } from "../tracking-settings";

export default async function ProgramSettingsPage({
  params,
}: {
  params: { slug: string; programId: string };
}) {
  const { programId } = params;

  return (
    <div className="mb-10 grid grid-cols-1 gap-8">
      <ProgramSettings />
      <TrackingSettings />
      <DeleteProgram programId={programId} />
    </div>
  );
}
