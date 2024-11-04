import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { ConversionTable } from "./conversion-table";

export default function ProgramConversions({
  params,
}: {
  params: { slug: string; programId: string };
}) {
  const { programId } = params;

  return (
    <PageContent title="Conversions">
      <MaxWidthWrapper>
        <div className="mt-6">
          <ConversionTable programId={programId} />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
