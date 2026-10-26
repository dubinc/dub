import useWorkspace from "@/lib/swr/use-workspace";
import { Receipt2 } from "@dub/ui";
import { useParams } from "next/navigation";
import { PageNavTabs } from "../layout/page-nav-tabs";

const tabs = [
  {
    id: "sales",
    label: "Sales",
    icon: Receipt2,
  },
];

export function CustomerTabs() {
  const { customerId } = useParams<{ customerId: string }>();
  const { slug: workspaceSlug } = useWorkspace();

  return (
    <PageNavTabs
      basePath={`/${workspaceSlug}/links/customers/${customerId}`}
      tabs={tabs}
    />
  );
}
