import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES } from "@/lib/bounty/api/performance-bounty-scope-attributes";
import { PartnerBountyProps } from "@/lib/types";
import { currencyFormatter, nFormatter } from "@dub/utils";
import {
  BountyProgressBarRow,
  EmphasisNumber,
} from "./bounty-progress-bar-row";

export function BountyPerformance({ bounty }: { bounty: PartnerBountyProps }) {
  const performanceCondition = bounty.performanceCondition;

  if (!performanceCondition) {
    return null;
  }

  const { attribute } = performanceCondition;

  // Current value
  const value = bounty.submissions?.[0]?.performanceCount ?? 0;
  const formattedValue = isCurrencyAttribute(attribute)
    ? currencyFormatter(value, { trailingZeroDisplay: "stripIfInteger" })
    : nFormatter(value, { full: true });

  // Target value
  const target = performanceCondition.value;
  const formattedTarget = isCurrencyAttribute(attribute)
    ? currencyFormatter(target, { trailingZeroDisplay: "stripIfInteger" })
    : nFormatter(target, { full: true });

  const metricLabel =
    PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES[attribute].toLowerCase();

  const percent =
    target > 0 ? Math.min(Math.max(value / target, 0), 1) * 100 : 0;

  console.log({ percent, target, value });

  return (
    <BountyProgressBarRow progress={percent}>
      <EmphasisNumber>{formattedValue}</EmphasisNumber> of{" "}
      <EmphasisNumber>{formattedTarget}</EmphasisNumber> {metricLabel} generated
    </BountyProgressBarRow>
  );
}
