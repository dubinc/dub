import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { Suspense } from "react";
import { BankAccount } from "./bank-account";
import { ComplianceFlow } from "./compliance-flow";
import { Transactions } from "./transactions";
import { Wallet } from "./wallet";

export default function BankAccounts() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContent title="Bank Accounts">
        <div className="relative min-h-[calc(100vh-16px)]">
          <MaxWidthWrapper className="grid gap-5 pb-10 pt-3">
            <BankAccount />
            <ComplianceFlow />
            <Wallet />
            <Transactions />
          </MaxWidthWrapper>
        </div>
      </PageContent>
    </Suspense>
  );
}
