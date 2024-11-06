import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";
import { BankAccount } from "./bank-account";
import { ComplianceFlow } from "./compliance-flow";
import { Transactions } from "./transactions";
import { Wallet } from "./wallet";

export default function BankAccounts() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <h1 className="text-2xl font-semibold tracking-tight text-black">
        Payouts
      </h1>
      <div className="relative min-h-[calc(100vh-16px)]">
        <div className="grid gap-5 pb-10 pt-3">
          <BankAccount />
          <ComplianceFlow />
          <Wallet />
          <Transactions />
        </div>
      </div>
    </Suspense>
  );
}
