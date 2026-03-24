import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES } from "@/lib/bounty/api/performance-bounty-scope-attributes";
import { PartnerBountyProps } from "@/lib/types";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";
import {
  BountyProgressBarRow,
  EmphasisNumber,
} from "./bounty-progress-bar-row";

export function PerformanceBountyProgress({
  bounty,
  labelClassName,
  wrapperClassName,
}: {
  bounty: PartnerBountyProps;
  labelClassName?: string;
  wrapperClassName?: string;
}) {
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

  return (
    <BountyProgressBarRow
      progress={percent}
      labelClassName={labelClassName}
      wrapperClassName={wrapperClassName}
    >
      <EmphasisNumber>{formattedValue}</EmphasisNumber> of{" "}
      <EmphasisNumber>{formattedTarget}</EmphasisNumber> {metricLabel} generated
    </BountyProgressBarRow>
  );
}

export function SubmissionBountyProgress({
  bounty,
  labelClassName,
  wrapperClassName,
  className,
}: {
  bounty: PartnerBountyProps;
  labelClassName?: string;
  wrapperClassName?: string;
  className?: string;
}) {
  const submittedCount = bounty.submissions.filter(
    ({ status }) => status !== "draft",
  ).length;

  const approvedCount = bounty.submissions.filter(
    ({ status }) => status === "approved",
  ).length;

  const maxSubmissions = bounty.maxSubmissions || 1;
  const submittedPercent = (submittedCount / maxSubmissions) * 100;
  const approvedPercent = (approvedCount / maxSubmissions) * 100;

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row", className)}>
      <BountyProgressBarRow
        progress={submittedPercent}
        labelClassName={labelClassName}
        wrapperClassName={wrapperClassName}
      >
        <EmphasisNumber>{submittedCount}</EmphasisNumber> of{" "}
        <EmphasisNumber>{maxSubmissions}</EmphasisNumber> submitted
      </BountyProgressBarRow>
      <BountyProgressBarRow
        progress={approvedPercent}
        labelClassName={labelClassName}
        wrapperClassName={wrapperClassName}
      >
        <EmphasisNumber>{approvedCount}</EmphasisNumber> approved
      </BountyProgressBarRow>
    </div>
  );
}
