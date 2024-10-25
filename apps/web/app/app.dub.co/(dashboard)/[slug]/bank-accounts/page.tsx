import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { Suspense } from "react";
import { BankAccount } from "./bank-account";
import { ComplianceFlow } from "./compliance-flow";
import { Finance } from "./finance";

export default function BankAccounts({ params }: { params: { slug: string } }) {
  const { slug: workspaceSlug } = params;

  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContent title="Bank Accounts">
        <div className="relative min-h-[calc(100vh-16px)]">
          <MaxWidthWrapper className="grid gap-5 pb-10 pt-3">
            <BankAccount />
            <ComplianceFlow />
            <Finance workspaceSlug={workspaceSlug} />
          </MaxWidthWrapper>
        </div>
      </PageContent>
    </Suspense>
  );
}
