import {
  CommissionDescriptionTooltipContext,
  formatCommissionDescriptionTooltip,
} from "@/lib/commissions/format-commission-description-tooltip";
import { CommissionProps, CustomerProps } from "@/lib/types";
import { Tooltip } from "@dub/ui";
import { getCommissionTypeLabel } from "./commission-type-badge";

export function CommissionDescriptionLabel({
  commission,
  context,
  className = "min-w-0 truncate text-sm text-neutral-700",
}: {
  commission: Pick<CommissionProps, "type" | "quantity" | "description"> & {
    customer?: Pick<CustomerProps, "email" | "name"> | null;
  };
  context: CommissionDescriptionTooltipContext;
  className?: string;
}) {
  if (commission.type === "custom" && commission.description) {
    return (
      <Tooltip
        content={formatCommissionDescriptionTooltip(
          commission.description,
          context,
        )}
      >
        <span className={className}>{commission.description}</span>
      </Tooltip>
    );
  }

  return (
    <span className={className}>{getCommissionTypeLabel(commission)}</span>
  );
}
