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

  const { incrementalAmount, bonusAmount, capAmount } = variableBonus;

  if (
    incrementalAmount == null ||
    bonusAmount == null ||
    capAmount == null ||
    incrementalAmount < 1 ||
    capAmount < 1
  ) {
    return null;
  }

  const formattedBonus = currencyFormatter(bonusAmount, {
    trailingZeroDisplay: "stripIfInteger",
  });

  return `For each additional ${incrementalAmount} ${socialMetrics.metric} earn ${formattedBonus}, up to ${capAmount} ${socialMetrics.metric}`;
}
