import { PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES } from "@/lib/api/bounties/performance-bounty-scope-attributes";
import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { PartnerBountyProps } from "@/lib/types";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";

export function BountyPerformance({ bounty }: { bounty: PartnerBountyProps }) {
  const performanceCondition = bounty.performanceCondition;

  if (!performanceCondition) {
    return null;
  }

  const attribute = performanceCondition.attribute;
  const target = performanceCondition.value;
  const value = bounty.submission?.performanceCount ?? 0;

  const formattedValue =
    value === undefined
      ? "-"
      : isCurrencyAttribute(attribute)
        ? currencyFormatter(value, { trailingZeroDisplay: "stripIfInteger" })
        : nFormatter(value, { full: true });

  const formattedTarget = isCurrencyAttribute(attribute)
    ? currencyFormatter(target, { trailingZeroDisplay: "stripIfInteger" })
    : nFormatter(target, { full: true });

  const metricLabel =
    PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES[
      performanceCondition.attribute
    ].toLowerCase();

  const expiredBounty =
    bounty.endsAt && new Date(bounty.endsAt) < new Date() ? true : false;

  return (
    <div className="flex flex-col gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
        {value && (
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
        {metricLabel} generated
      </span>
    </div>
  );
}
