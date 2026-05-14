import { CommissionProps, CustomerProps } from "@/lib/types";
import { PartnerEarningsSchema } from "@/lib/zod/schemas/partner-profile";
import { capitalize, pluralize } from "@dub/utils";
import * as z from "zod/v4";
import { CommissionTypeIcon } from "./comission-type-icon";

export const CommissionTypeBadge = ({
  type,
}: {
  type: z.infer<typeof PartnerEarningsSchema>["type"];
}) => {
  return (
    <div className="flex items-center gap-1.5">
      <CommissionTypeIcon type={type} />
      {capitalize(type)}
    </div>
  );
};

export function getCommissionTypeLabel(
  commission: Pick<CommissionProps, "type" | "quantity"> & {
    customer?: Pick<CustomerProps, "email" | "name"> | null;
  },
) {
  if (commission.type === "click") {
    return `${commission.quantity} ${pluralize("click", commission.quantity)}`;
  }

  if (
    (commission.type === "lead" || commission.type === "sale") &&
    commission.customer
  ) {
    const customerLabel = commission.customer.email ?? commission.customer.name;

    if (customerLabel) {
      return customerLabel;
    }
  }

  if (commission.type === "referral") {
    return "Partner referral";
  }

  if (commission.type === "custom") {
    return "Custom commission";
  }

  return "-";
}
