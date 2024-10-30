import { DeleteProgram } from "./delete-program";
import { ProgramSettings } from "./settings";

export default async function ProgramSettingsPage({
  params,
}: {
  params: { slug: string; programId: string };
}) {
  const { programId } = params;

  // TODO:
  // Add suspense loader

  return (
    <div className="mt-8 space-y-10">
      <ProgramSettings programId={programId} />
      <DeleteProgram programId={programId} />
    </div>
  );
}
