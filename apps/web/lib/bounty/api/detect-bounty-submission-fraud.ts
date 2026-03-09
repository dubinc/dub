import { PartnerPlatform } from "@dub/prisma/client";

// Thresholds for fraud detection signals
const SPIKE_MULTIPLIER = 5;
const ENGAGEMENT_RATE_MULTIPLIER = 3;
const LOW_FOLLOWER_THRESHOLD = 500;
const HIGH_ENGAGEMENT_THRESHOLD = 10_000;

type FraudRiskLevel = "low" | "medium" | "high";

type FraudFlag =
  | "engagementSpike"
  | "lowFollowerHighEngagement"
  | "engagementRateAnomaly";

const FRAUD_FLAG_SEVERITY: Record<FraudFlag, FraudRiskLevel> = {
  engagementSpike: "high",
  lowFollowerHighEngagement: "high",
  engagementRateAnomaly: "medium",
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
  fraudRiskLevel: FraudRiskLevel | null;
  fraudFlags: FraudFlag[];
}

/**
 * Detects potential botting/fraud signals on a bounty submission by comparing
 * the submission's engagement metrics against the partner's historical baselines.
 *
 * - engagementSpike: metrics far exceed partner's median
 * - engagementRateAnomaly: engagement rate significantly above baseline
 * - lowFollowerHighEngagement: disproportionate reach vs audience size
 */
export function detectBountySubmissionFraud({
  socialMetricCount,
  bountyMetric,
  partnerPlatform,
}: DetectBountyFraudInput): BountyFraudResult {
  console.log("[detectBountySubmissionFraud] input", {
    socialMetricCount,
    bountyMetric,
    partnerPlatform,
  });

  // New/unverified accounts with no historical posts synced
  if (!partnerPlatform || partnerPlatform.medianViews === null) {
    return {
      fraudRiskLevel: null,
      fraudFlags: [],
    };
  }

  const flags: FraudFlag[] = [];

  const median =
    bountyMetric === "views"
      ? Number(partnerPlatform.medianViews)
      : Number(partnerPlatform.medianLikes);

  // Signal: engagementSpike
  // Submission metrics far exceed the partner's historical median
  if (median > 0 && socialMetricCount > median * SPIKE_MULTIPLIER) {
    console.log("[detectBountySubmissionFraud] engagementSpike detected", {
      ratio: socialMetricCount / median,
    });

    flags.push("engagementSpike");
  }

  // Signal: engagementRateAnomaly
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
      const currentRatio = socialMetricCount / medianViews;

      if (
        currentRatio > ENGAGEMENT_RATE_MULTIPLIER &&
        expectedLikes > medianLikes * ENGAGEMENT_RATE_MULTIPLIER
      ) {
        console.log(
          "[detectBountySubmissionFraud] engagementRateAnomaly detected",
          {
            currentRatio,
            expectedLikes,
            medianLikes,
            medianEngagementRate: partnerPlatform.medianEngagementRate,
          },
        );

        flags.push("engagementRateAnomaly");
      }
    }
  }

  // Signal: lowFollowerHighEngagement
  // Disproportionate reach relative to audience size
  const subscribers = Number(partnerPlatform.subscribers);

  if (
    subscribers < LOW_FOLLOWER_THRESHOLD &&
    socialMetricCount > HIGH_ENGAGEMENT_THRESHOLD
  ) {
    console.log(
      "[detectBountySubmissionFraud] lowFollowerHighEngagement detected",
      {
        subscribers,
        socialMetricCount,
      },
    );

    flags.push("lowFollowerHighEngagement");
  }

  return {
    fraudRiskLevel: getHighestSeverity(flags),
    fraudFlags: flags,
  };
}

function getHighestSeverity(flags: FraudFlag[]): FraudRiskLevel | null {
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
    const severity = FRAUD_FLAG_SEVERITY[flag];

    if (severityRank[severity] > severityRank[highest]) {
      highest = severity;
    }
  }

  return highest;
}
