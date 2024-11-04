import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PartnerStats } from "./partner-stats";
import { PartnerTable } from "./partner-table";

export default function ProgramPartners({
  params,
}: {
  params: { slug: string; programId: string };
}) {
  const { programId } = params;

  return (
    <PageContent title="Partners">
      <MaxWidthWrapper>
        <PartnerStats programId={programId} />
        <div className="mt-6">
          <PartnerTable programId={programId} />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
