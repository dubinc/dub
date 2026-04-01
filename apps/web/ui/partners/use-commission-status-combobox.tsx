import { commissionPatchStatusSchema } from "@/lib/zod/schemas/commissions";
import { useMemo } from "react";
import { CommissionStatusBadges } from "./commission-status-badges";

export function useCommissionStatusCombobox(selectedStatus: string) {
  const statusOptions = commissionPatchStatusSchema.options;

  const statusComboboxOptions = useMemo(
    () =>
      statusOptions.map((status) => {
        const badge = CommissionStatusBadges[status];
        const StatusIcon = badge?.icon;
        const statusTextClass = badge?.className
          ?.split(" ")
          .find((className) => className.startsWith("text-"));

        return {
          value: status,
          label: badge?.label ?? status,
          variant: badge?.variant ?? "neutral",
          icon: StatusIcon ? (
            <StatusIcon
              className={`size-4 ${statusTextClass ?? "text-neutral-500"}`}
            />
          ) : undefined,
        };
      }),
    [statusOptions],
  );

  const selectedStatusOption = useMemo(
    () =>
      statusComboboxOptions.find((option) => option.value === selectedStatus),
    [statusComboboxOptions, selectedStatus],
  );

  return {
    statusComboboxOptions,
    selectedStatusOption,
  };
}
