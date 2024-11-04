import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PartnerStats } from "./stats";

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
      </MaxWidthWrapper>
    </PageContent>
  );
}
