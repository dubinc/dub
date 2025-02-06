import { DeleteProgram } from "./delete-program";

export default async function ProgramSettingsAdvancedPage({
  params,
}: {
  params: { slug: string; programId: string };
}) {
  const { programId } = params;

  return <DeleteProgram programId={programId} />;
}
