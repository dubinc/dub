import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerEnriched } from "@/lib/types";
import { MoneyBills2, Receipt2 } from "@dub/ui";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { PageNavTabs } from "../layout/page-nav-tabs";

export function CustomerTabs({
  customer,
}: {
  customer?: Pick<CustomerEnriched, "programId" | "partner">;
}) {
  const { customerId } = useParams<{ customerId: string }>();
  const { slug: workspaceSlug } = useWorkspace();

  const tabs = useMemo(
    () => [
      {
        id: "sales",
        label: "Sales",
        icon: Receipt2,
      },
      ...(customer?.programId && customer.partner
        ? [
            {
              id: "earnings",
              label: "Partner earnings",
              icon: MoneyBills2,
            },
          ]
        : []),
    ],
    [customer?.programId, customer?.partner],
  );

  return (
    <PageNavTabs
      basePath={`/${workspaceSlug}/customers/${customerId}`}
      tabs={tabs}
    />
  );
}
