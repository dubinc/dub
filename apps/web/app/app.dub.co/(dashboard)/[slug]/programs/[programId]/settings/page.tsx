import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
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
    <PageContent title="Program Settings">
      <MaxWidthWrapper>
        <div className="grid grid-cols-1 gap-8">
          <ProgramSettings />
          <DeleteProgram programId={programId} />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
