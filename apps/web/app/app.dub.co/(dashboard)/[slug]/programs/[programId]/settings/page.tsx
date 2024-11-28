import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { DeleteProgram } from "./delete-program";
import { ProgramSettings } from "./program-settings";
import { TrackingSettings } from "./tracking-settings";

interface Params {
  programId: string;
}

export default async function ProgramSettingsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { programId } = await params;

  return (
    <PageContent title="Program Settings">
      <MaxWidthWrapper>
        <div className="mb-10 grid grid-cols-1 gap-8">
          <ProgramSettings />
          <TrackingSettings />
          <DeleteProgram programId={programId} />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
