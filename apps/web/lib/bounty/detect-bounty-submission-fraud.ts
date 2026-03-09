import { PartnerPlatform } from "@dub/prisma/client";

// Thresholds for fraud detection signals
const SPIKE_MULTIPLIER = 5;
const ENGAGEMENT_RATE_MULTIPLIER = 3;
const LOW_FOLLOWER_THRESHOLD = 500;
const HIGH_ENGAGEMENT_THRESHOLD = 10_000;

type FraudRiskLevel = "low" | "medium" | "high";

const FRAUD_FLAG_SEVERITY: Record<string, FraudRiskLevel> = {
  engagement_spike: "high",
  low_follower_high_engagement: "high",
  engagement_rate_anomaly: "medium",
  no_baseline_history: "medium",
};

type PartnerPlatformBaseline = Pick<
  PartnerPlatform,
  | "medianViews"
  | "medianLikes"
  | "medianComments"
  | "medianEngagementRate"
  | "subscribers"
>;

interface DetectBountyFraudInput {
  socialMetricCount: number;
  bountyMetric: "views" | "likes";
  partnerPlatform: PartnerPlatformBaseline | null;
}

interface BountyFraudResult {
  fraudRiskLevel: string | null;
  fraudFlags: string[];
}

/**
 * Detects potential botting/fraud signals on a bounty submission by comparing
 * the submission's engagement metrics against the partner's historical baselines.
 *
 * Signals based on industry standards:
 * - engagement_spike: metrics far exceed partner's median (purchased views/likes)
 * - engagement_rate_anomaly: engagement rate significantly above baseline
 * - no_baseline_history: no historical data to benchmark against
 * - low_follower_high_engagement: disproportionate reach vs audience size
 */
export function detectBountySubmissionFraud({
  socialMetricCount,
  bountyMetric,
  partnerPlatform,
}: DetectBountyFraudInput): BountyFraudResult {
  const flags: string[] = [];

  // Signal: no_baseline_history
  // New/unverified accounts with no historical posts synced
  if (!partnerPlatform || partnerPlatform.medianViews === null) {
    flags.push("no_baseline_history");

    return {
      fraudRiskLevel: getHighestSeverity(flags),
      fraudFlags: flags,
    };
  }

  const median =
    bountyMetric === "views"
      ? Number(partnerPlatform.medianViews)
      : Number(partnerPlatform.medianLikes);

  // Signal: engagement_spike
  // Submission metrics far exceed the partner's historical median
  if (median > 0 && socialMetricCount > median * SPIKE_MULTIPLIER) {
    flags.push("engagement_spike");
  }

  // Signal: engagement_rate_anomaly
  // When tracking views: check if the ratio of likes-to-views implied by the
  // submission is significantly higher than the partner's baseline engagement rate
  if (
    bountyMetric === "views" &&
    partnerPlatform.medianEngagementRate !== null &&
    partnerPlatform.medianEngagementRate > 0 &&
    partnerPlatform.medianLikes !== null
  ) {
    const medianLikes = Number(partnerPlatform.medianLikes);
    const medianViews = Number(partnerPlatform.medianViews);

    if (medianViews > 0 && medianLikes > 0) {
      // Expected likes at this view count based on baseline engagement rate
      const expectedLikes =
        socialMetricCount * partnerPlatform.medianEngagementRate;
      // If views are growing but the view count implies an engagement pattern
      // that would require an abnormally high rate, flag it
      const impliedViewsForMedianLikes = medianLikes / medianViews;
      const currentRatio = socialMetricCount / medianViews;

      if (
        currentRatio > ENGAGEMENT_RATE_MULTIPLIER &&
        expectedLikes > medianLikes * ENGAGEMENT_RATE_MULTIPLIER
      ) {
        flags.push("engagement_rate_anomaly");
      }
    }
  }

  // Signal: low_follower_high_engagement
  // Disproportionate reach relative to audience size
  const subscribers = Number(partnerPlatform.subscribers);

  if (
    subscribers < LOW_FOLLOWER_THRESHOLD &&
    socialMetricCount > HIGH_ENGAGEMENT_THRESHOLD
  ) {
    flags.push("low_follower_high_engagement");
  }

  return {
    fraudRiskLevel: getHighestSeverity(flags),
    fraudFlags: flags,
  };
}

function getHighestSeverity(flags: string[]): string | null {
  if (flags.length === 0) {
    return null;
  }

  const severityRank: Record<FraudRiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
  };

  let highest: FraudRiskLevel = "low";

  for (const flag of flags) {
    const severity = FRAUD_FLAG_SEVERITY[flag] ?? "low";

    if (severityRank[severity] > severityRank[highest]) {
      highest = severity;
    }
  }

  return highest;
}
