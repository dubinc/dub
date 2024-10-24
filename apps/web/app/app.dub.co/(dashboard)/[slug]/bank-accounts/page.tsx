import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import { Suspense } from "react";
import { BankAccountsClient } from "./page-client";

export default function BankAccounts() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContent title="Bank Accounts">
        <BankAccountsClient />
      </PageContent>
    </Suspense>
  );
}
