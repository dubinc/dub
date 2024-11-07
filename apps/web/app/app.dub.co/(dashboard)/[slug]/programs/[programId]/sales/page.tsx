import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { SaleTable } from "./sale-table";

export default function ProgramSales({
  params,
}: {
  params: { slug: string; programId: string };
}) {
  const { programId } = params;

  return (
    <PageContent title="Sales">
      <MaxWidthWrapper>
        <div className="mt-6">
          <SaleTable programId={programId} />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
