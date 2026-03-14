import { resolveBountyDetails } from "@/lib/bounty/utils";
import { PartnerBountyProps } from "@/lib/types";
import { Check2 } from "@dub/ui";
import { currencyFormatter, nFormatter } from "@dub/utils";

export function getBountyRewardCriteria(
  bounty: PartnerBountyProps | Parameters<typeof resolveBountyDetails>[0],
) {
  const bountyInfo = resolveBountyDetails(bounty);

  if (
    !bountyInfo?.socialMetrics ||
    !bountyInfo.socialPlatform ||
    !bountyInfo.rewardAmount
  ) {
    return [];
  }

  const formattedAmount = currencyFormatter(bountyInfo.rewardAmount, {
    trailingZeroDisplay: "stripIfInteger",
  });

  const socialPlatform = bountyInfo.socialPlatform;
  const { minCount, metric, incrementalBonus } = bountyInfo.socialMetrics;

  const texts: string[] = [
    `Get ${nFormatter(minCount ?? 0, { full: true })} ${metric} on your ${socialPlatform.label} content, earn ${formattedAmount}`,
  ];

  if (incrementalBonus) {
    const { incrementCount, bonusPerIncrement, maxCount } = incrementalBonus;

    if (incrementCount && bonusPerIncrement && maxCount) {
      const formattedBonus = currencyFormatter(bonusPerIncrement, {
        trailingZeroDisplay: "stripIfInteger",
      });

      texts.push(
        `For each additional ${nFormatter(incrementCount, { full: true })} ${metric} on your ${socialPlatform.label} content, earn ${formattedBonus} – up to ${nFormatter(maxCount, { full: true })} ${metric}`,
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
      <h3 className="text-content-emphasis text-lg font-semibold">
        Reward criteria
      </h3>

      <div className="mt-2 flex flex-col gap-1">
        {rewardTexts.map((text) => (
          <div className="flex items-center gap-1.5" key={text}>
            <Check2 className="size-3 shrink-0 text-green-600" />
            <span className="text-sm font-normal text-neutral-600 dark:text-neutral-400">
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
