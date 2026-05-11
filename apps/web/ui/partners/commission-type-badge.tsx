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
      {type === "referral" ? "Partner referral" : capitalize(type)}
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

  if (commission.customer) {
    return `${commission.customer.email || commission.customer.name}`;
  }

  if (commission.type === "referral") {
    return "Partner referral";
  }

  return "Custom commission";
}
