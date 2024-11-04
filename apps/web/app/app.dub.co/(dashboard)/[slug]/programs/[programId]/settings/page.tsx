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
    <PageContent title="Settings">
      <MaxWidthWrapper>
        <div className="mt-8 space-y-10">
          <ProgramSettings programId={programId} />
          <DeleteProgram programId={programId} />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
