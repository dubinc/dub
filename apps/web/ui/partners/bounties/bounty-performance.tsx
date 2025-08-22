import {
  WORKFLOW_TRIGGER_ATTRIBUTE_LABELS,
  isCurrencyAttribute,
} from "@/lib/api/workflows/utils";
import { BountyWithPartnerDataProps } from "@/lib/types";
import { currencyFormatter, nFormatter } from "@dub/utils";

export function BountyPerformance({
  bounty,
}: {
  bounty: BountyWithPartnerDataProps;
}) {
  const performanceCondition = bounty.performanceCondition;

  if (!performanceCondition) return null;

  const attribute = performanceCondition.attribute;
  const target = performanceCondition.value;
  let value: number | undefined = undefined;

  if (attribute === "totalLeads") value = bounty.partner.leads;
  else if (attribute === "totalConversions") value = bounty.partner.conversions;
  else if (attribute === "totalSaleAmount") value = bounty.partner.saleAmount;
  else if (attribute === "totalCommission")
    value = bounty.partner.totalCommissions;

  const formattedValue =
    value === undefined
      ? "-"
      : isCurrencyAttribute(attribute)
        ? currencyFormatter(value / 100)
        : nFormatter(value);

  const formattedTarget = isCurrencyAttribute(attribute)
    ? currencyFormatter(target / 100)
    : nFormatter(target);

  const metricLabel =
    WORKFLOW_TRIGGER_ATTRIBUTE_LABELS[
      performanceCondition.attribute
    ].toLowerCase();

  return (
    <div className="flex flex-col gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
        {value && (
          <div
            style={{
              width: Math.min(Math.max(value / target, 0), 1) * 100 + "%",
            }}
            className="h-full rounded-full bg-orange-600"
          />
        )}
      </div>
      <span className="text-content-default text-xs font-medium">
        <strong className="text-content-emphasis font-semibold">
          {formattedValue}
        </strong>{" "}
        of{" "}
        <strong className="text-content-emphasis font-semibold">
          {formattedTarget}
        </strong>{" "}
        {metricLabel} generated
      </span>
    </div>
  );
}
