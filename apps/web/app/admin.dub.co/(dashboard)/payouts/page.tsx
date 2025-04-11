import LayoutLoader from "@/ui/layout/layout-loader";
import { prisma } from "@dub/prisma";
import { ACME_WORKSPACE_ID } from "@dub/utils";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function PayoutsPage() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <PayoutsRSC />
    </Suspense>
  );
}

async function PayoutsRSC() {
  const invoices = await prisma.invoice.findMany({
    where: {
      workspaceId: {
        not: ACME_WORKSPACE_ID,
      },
      paidAt: {
        not: null,
      },
    },
  });

  return (
    <div>
      <h1>Payouts</h1>
      <pre>{JSON.stringify(invoices, null, 2)}</pre>
    </div>
  );
}
