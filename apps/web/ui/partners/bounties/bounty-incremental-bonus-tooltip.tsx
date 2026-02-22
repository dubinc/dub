import { PartnerBountyProps } from "@/lib/types";
import { InfoTooltip } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";

export function BountyIncrementalBonusTooltip({
  bounty,
  onTooltipClick,
}: {
  bounty: Pick<PartnerBountyProps, "submissionRequirements">;
  onTooltipClick?: (e: React.MouseEvent) => void;
}) {
  const description = getBountyIncrementalBonusDescription(bounty);

  if (!description) {
    return null;
  }

  return (
    <span
      className="inline-flex shrink-0 align-middle"
      onClick={onTooltipClick}
    >
      <InfoTooltip content={description} />
    </span>
  );
}

function getBountyIncrementalBonusDescription(
  bounty: Pick<PartnerBountyProps, "submissionRequirements">,
): string | null {
  const socialMetrics = bounty.submissionRequirements?.socialMetrics;
  const variableBonus = socialMetrics?.incrementalBonus;

  if (!socialMetrics?.metric || !variableBonus) {
    return null;
  }

  const { incrementCount, bonusPerIncrement, maxCount } = variableBonus;

  if (
    incrementCount == null ||
    bonusPerIncrement == null ||
    maxCount == null ||
    incrementCount < 1 ||
    maxCount < 1
  ) {
    return null;
  }

  const formattedBonus = currencyFormatter(bonusPerIncrement, {
    trailingZeroDisplay: "stripIfInteger",
  });

  return `For each additional ${incrementCount} ${socialMetrics.metric} earn ${formattedBonus}, up to ${maxCount} ${socialMetrics.metric}`;
}
