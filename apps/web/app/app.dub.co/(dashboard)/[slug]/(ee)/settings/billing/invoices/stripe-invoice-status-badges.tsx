import { StripeInvoiceStatusSchema } from "@/lib/zod/schemas/invoices";
import { StatusBadgeVariant } from "@dub/ui";
import * as z from "zod/v4";

type StripeInvoiceStatus = z.infer<typeof StripeInvoiceStatusSchema>;

export const StripeInvoiceStatusBadges: Record<
  StripeInvoiceStatus,
  {
    label: string;
    variant: StatusBadgeVariant["variant"];
  }
> = {
  draft: {
    label: "Upcoming",
    variant: "new",
  },
  open: {
    label: "Open",
    variant: "error",
  },
  paid: {
    label: "Paid",
    variant: "success",
  },
  uncollectible: {
    label: "Uncollectible",
    variant: "neutral",
  },
  void: {
    label: "Void",
    variant: "neutral",
  },
};
