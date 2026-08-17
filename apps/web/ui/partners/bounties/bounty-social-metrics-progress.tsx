import { resolveBountyDetails } from "@/lib/bounty/utils";
import { BountySubmissionProps, PartnerBountyProps } from "@/lib/types";
import { cn, nFormatter } from "@dub/utils";
import { PLATFORM_ICONS } from "./bounty-platform-icons";
import { EmphasisNumber } from "./bounty-progress-bar-row";

type SubmissionForProgress = Pick<
  BountySubmissionProps,
  "socialMetricCount" | "socialMetricResults"
>;

function ProgressRow({
  count,
  minCount,
  metric,
  Icon,
  suffix = "generated",
}: {
  count: number;
  minCount: number;
  metric: string;
  Icon: (typeof PLATFORM_ICONS)[keyof typeof PLATFORM_ICONS];
  suffix?: string;
}) {
  const percent = minCount > 0 ? Math.min((count / minCount) * 100, 100) : 100;
  const isComplete = percent >= 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="bg-bg-emphasis h-1 w-full rounded-full">
        <div
          className={cn(
            "h-full rounded-full",
            isComplete ? "bg-green-600" : "bg-amber-600",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0" />
        <p className="text-content-subtle text-sm font-medium">
          <EmphasisNumber>{nFormatter(count, { full: true })}</EmphasisNumber>
          {" of "}
          <EmphasisNumber>
            {nFormatter(minCount, { full: true })}
          </EmphasisNumber>
          {` ${metric} ${suffix}`}
        </p>
      </div>
    </div>
  );
}

/**
 * Renders the social metrics progress toward a bounty's target: a single progress row
 * for OR bounties (aggregate count against the matched platform), or one row per
 * required platform for AND bounties (using the per-platform breakdown).
 */
export function BountySocialMetricsProgress({
  bounty,
  submission,
}: {
  bounty: Pick<PartnerBountyProps, "submissionRequirements" | "rewardAmount">;
  submission: SubmissionForProgress;
}) {
  const bountyInfo = resolveBountyDetails(bounty);
  const socialMetrics = bountyInfo?.socialMetrics;
  const socialPlatforms = bountyInfo?.socialPlatforms ?? [];

  if (!socialMetrics || socialPlatforms.length === 0) {
    return null;
  }

  const minCount = socialMetrics.minCount ?? 0;

  if (bountyInfo?.isAndSocialMetrics) {
    return (
      <div className="flex flex-col gap-3">
        {socialPlatforms.map((platform) => {
          const result = submission.socialMetricResults?.find(
            (r) => r.platform === platform.value,
          );
          const Icon = PLATFORM_ICONS[platform.value];

          return (
            <ProgressRow
              key={platform.value}
              count={result?.metricCount ?? 0}
              minCount={minCount}
              metric={socialMetrics.metric}
              Icon={Icon}
            />
          );
        })}
      </div>
    );
  }

  const matchedPlatformValue = submission.socialMetricResults?.find(
    (r) => r.metricCount != null,
  )?.platform;
  const platform =
    socialPlatforms.find((p) => p.value === matchedPlatformValue) ??
    socialPlatforms[0];
  const Icon = PLATFORM_ICONS[platform.value];

  return (
    <ProgressRow
      count={submission.socialMetricCount ?? 0}
      minCount={minCount}
      metric={socialMetrics.metric}
      Icon={Icon}
      suffix="generated"
    />
  );
}
