import { PartnerBountyProps } from "@/lib/types";
import { getBountyRewardCriteria } from "@/ui/partners/bounties/bounty-reward-criteria";
import { getBountySubmissionRequirements } from "@/ui/partners/bounties/bounty-submission-requirements";
import { Markdown } from "@/ui/shared/markdown";
import { PROSE_STYLES } from "@dub/ui";
import { cn } from "@dub/utils";

export function bountyHasDetails(bounty: PartnerBountyProps): boolean {
  const hasDescription = Boolean(bounty.description?.trim());
  const hasSubmissionRequirements =
    getBountySubmissionRequirements(bounty).length > 0;
  const hasRewardCriteria = getBountyRewardCriteria(bounty).length > 0;
  return hasDescription || hasSubmissionRequirements || hasRewardCriteria;
}

export function BountyDescription({
  bounty,
  hideHeading = false,
}: {
  bounty: PartnerBountyProps;
  hideHeading?: boolean;
}) {
  const hasDescription = Boolean(bounty.description?.trim());

  if (!hasDescription) {
    return null;
  }

  return (
    <div className="flex flex-col text-sm">
      {hasDescription && (
        <div>
          {!hideHeading && (
            <span className="text-content-emphasis font-semibold">
              Bounty details
            </span>
          )}
          <div
            className={cn(
              !hideHeading && "mt-2",
              "text-content-subtle text-sm font-medium leading-5",
            )}
          >
            <Markdown className={cn(PROSE_STYLES.default)}>
              {bounty.description!.trim()}
            </Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
