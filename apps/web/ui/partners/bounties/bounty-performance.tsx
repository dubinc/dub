import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { PartnerBountyProps } from "@/lib/types";
import { WORKFLOW_ATTRIBUTE_LABELS } from "@/lib/zod/schemas/workflows";
import { currencyFormatter, nFormatter } from "@dub/utils";

export function BountyPerformance({ bounty }: { bounty: PartnerBountyProps }) {
  const performanceCondition = bounty.performanceCondition;

  if (!performanceCondition) return null;

  const attribute = performanceCondition.attribute;
  const target = performanceCondition.value;
  const value = bounty.partner[attribute];

  const formattedValue =
    value === undefined
      ? "-"
      : isCurrencyAttribute(attribute)
        ? currencyFormatter(value / 100, {
            maximumFractionDigits: 2,
          })
        : nFormatter(value, { full: true });

  const formattedTarget = isCurrencyAttribute(attribute)
    ? currencyFormatter(target / 100)
    : nFormatter(target, { full: true });

  const metricLabel =
    WORKFLOW_ATTRIBUTE_LABELS[performanceCondition.attribute].toLowerCase();

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
