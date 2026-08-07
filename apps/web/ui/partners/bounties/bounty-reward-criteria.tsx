import {
  formatSocialPlatformsList,
  resolveBountyDetails,
} from "@/lib/bounty/utils";
import { PartnerBountyProps } from "@/lib/types";
import { Check2 } from "@dub/ui";
import { currencyFormatter, nFormatter } from "@dub/utils";

export function getBountyRewardCriteria(
  bounty: PartnerBountyProps | Parameters<typeof resolveBountyDetails>[0],
) {
  const bountyInfo = resolveBountyDetails(bounty);

  if (
    !bountyInfo?.socialMetrics ||
    bountyInfo.socialPlatforms.length === 0 ||
    !bountyInfo.rewardAmount
  ) {
    return [];
  }

  const formattedAmount = currencyFormatter(bountyInfo.rewardAmount, {
    trailingZeroDisplay: "stripIfInteger",
  });

  const { socialPlatforms, isAndSocialMetrics } = bountyInfo;
  const { minCount, metric, incrementalBonus } = bountyInfo.socialMetrics;
  const platformsList = formatSocialPlatformsList(
    socialPlatforms,
    isAndSocialMetrics ? "AND" : "OR",
  );

  const texts: string[] = [
    `Get ${nFormatter(minCount ?? 0, { full: true })} ${metric} on your ${platformsList} content, earn ${formattedAmount}`,
  ];

  if (incrementalBonus) {
    const { incrementCount, bonusPerIncrement, maxCount } = incrementalBonus;

    if (incrementCount && bonusPerIncrement && maxCount) {
      const formattedBonus = currencyFormatter(bonusPerIncrement, {
        trailingZeroDisplay: "stripIfInteger",
      });

      texts.push(
        isAndSocialMetrics
          ? `For each additional ${nFormatter(incrementCount, { full: true })} ${metric} on each of your ${platformsList} content, earn ${formattedBonus} – up to ${nFormatter(maxCount, { full: true })} ${metric} per platform`
          : `For each additional ${nFormatter(incrementCount, { full: true })} ${metric} on your ${platformsList} content, earn ${formattedBonus} – up to ${nFormatter(maxCount, { full: true })} ${metric}`,
      );
    }
  }

  return texts;
}

export function BountyRewardCriteria({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  const rewardTexts = getBountyRewardCriteria(bounty);

  if (rewardTexts.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-content-emphasis text-sm font-semibold">
        Reward criteria
      </h3>

      <div className="mt-2 flex flex-col gap-1">
        {rewardTexts.map((text) => (
          <div className="flex items-center gap-1.5" key={text}>
            <Check2 className="size-3 shrink-0 text-green-600" />
            <span className="text-content-subtle text-sm font-normal">
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
