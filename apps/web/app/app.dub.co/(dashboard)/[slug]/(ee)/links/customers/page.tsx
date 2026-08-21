import { CustomersMenuPopover } from "@/ui/customers/customers-menu-popover";
import { CustomersTable } from "@/ui/customers/customers-table/customers-table";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";

export default function CustomersPage() {
  return (
    <PageContent
      title="Customers"
      titleInfo={{
        title:
          "Get deeper, real-time insights about your customers' demographics, purchasing behavior, and lifetime value (LTV).",
        href: "https://dub.co/help/article/customer-insights",
      }}
      controls={<CustomersMenuPopover />}
    >
      <PageWidthWrapper>
        <CustomersTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
