import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES } from "@/lib/bounty/api/performance-bounty-scope-attributes";
import { PartnerBountyProps } from "@/lib/types";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";

type PerformanceDisplay = {
  value: number;
  target: number;
  formattedValue: string;
  formattedTarget: string;
  metricLabel: string;
};

function getPerformanceDisplay(
  bounty: PartnerBountyProps,
): PerformanceDisplay | null {
  const performanceCondition = bounty.performanceCondition;
  const socialMetrics = bounty.submissionRequirements?.socialMetrics;

  if (performanceCondition) {
    const attribute = performanceCondition.attribute;
    const target = performanceCondition.value;
    const value = bounty.submission?.performanceCount ?? 0;
    const isCurrency = isCurrencyAttribute(attribute);

    return {
      value,
      target,
      formattedValue:
        value === undefined
          ? "-"
          : isCurrency
            ? currencyFormatter(value, {
                trailingZeroDisplay: "stripIfInteger",
              })
            : nFormatter(value, { full: true }),
      formattedTarget: isCurrency
        ? currencyFormatter(target, { trailingZeroDisplay: "stripIfInteger" })
        : nFormatter(target, { full: true }),
      metricLabel:
        PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES[
          performanceCondition.attribute
        ].toLowerCase(),
    };
  }

  if (socialMetrics?.metric && socialMetrics.minCount != null) {
    const target = socialMetrics.minCount;
    const value = bounty.submission?.socialMetricCount ?? 0;

    return {
      value,
      target,
      formattedValue: nFormatter(value, { full: true }),
      formattedTarget: nFormatter(target, { full: true }),
      metricLabel: socialMetrics.metric.toLowerCase(),
    };
  }

  return null;
}

export function BountyPerformance({ bounty }: { bounty: PartnerBountyProps }) {
  const display = getPerformanceDisplay(bounty);

  if (!display) {
    return null;
  }

  const { value, target, formattedValue, formattedTarget, metricLabel } =
    display;
  const expiredBounty =
    bounty.endsAt && new Date(bounty.endsAt) < new Date() ? true : false;

  return (
    <div className="flex flex-col gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
        {value > 0 && target > 0 && (
          <div
            style={{
              width: Math.min(Math.max(value / target, 0), 1) * 100 + "%",
            }}
            className={cn(
              "h-full rounded-full bg-orange-600",
              expiredBounty && "bg-neutral-400",
            )}
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
        {metricLabel}
        {bounty.type === "performance" ? " generated" : ""}
      </span>
    </div>
  );
}
