import { StatusBadgeVariant } from "@dub/ui";
import { InvoiceStatus } from "@prisma/client";

export const InvoiceStatusBadges: Record<
  InvoiceStatus,
  {
    label: string;
    variant: StatusBadgeVariant["variant"];
  }
> = {
  processing: {
    label: "Processing",
    variant: "new",
  },
  completed: {
    label: "Completed",
    variant: "success",
  },
  failed: {
    label: "Failed",
    variant: "error",
  },
};
