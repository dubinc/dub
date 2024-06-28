import EmptyState from "@/ui/shared/empty-state";
import { InvoiceDollar } from "@dub/ui/src/icons";

export default function EventEmptyState() {
  return (
    <EmptyState
      icon={InvoiceDollar}
      title="Lead and sales analytics"
      description="Collect insights on lead generation and sales with metrics. Learn about top-converting leads and best-selling products."
      buttonText="Enable Sales Analytics"
      buttonLink="https://dub.co/docs"
    />
  );
}
