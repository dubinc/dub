import {
  getBountyRewardCriteriaTexts,
  getBountySubmissionRequirementTexts,
} from "@/lib/bounty/utils";
import { PartnerBountyProps } from "@/lib/types";
import { Markdown } from "@/ui/shared/markdown";
import { Check2, PROSE_STYLES } from "@dub/ui";
import { cn } from "@dub/utils";

export function bountyHasDetails(bounty: PartnerBountyProps): boolean {
  const submissionTexts = getBountySubmissionRequirementTexts(bounty);
  const rewardTexts = getBountyRewardCriteriaTexts(bounty);
  const hasDescription = Boolean(bounty.description?.trim());
  const hasSubmissionRequirements = submissionTexts.length > 0;
  const hasRewardCriteria = rewardTexts.length > 0;
  return hasDescription || hasSubmissionRequirements || hasRewardCriteria;
}

export function BountyDescription({
  bounty,
  hideHeading = false,
}: {
  bounty: PartnerBountyProps;
  hideHeading?: boolean;
}) {
  const submissionTexts = getBountySubmissionRequirementTexts(bounty);
  const rewardTexts = getBountyRewardCriteriaTexts(bounty);

  const hasDescription = Boolean(bounty.description?.trim());
  const hasSubmissionRequirements = submissionTexts.length > 0;
  const hasRewardCriteria = rewardTexts.length > 0;

  if (!hasDescription && !hasSubmissionRequirements && !hasRewardCriteria) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-3 text-sm">
      {hasDescription && (
        <div>
          {!hideHeading && (
            <span className="text-content-emphasis font-semibold">Details</span>
          )}
          <Markdown
            className={cn(
              PROSE_STYLES.default,
              "text-content-subtle text-sm font-medium leading-5",
            )}
          >
            {bounty.description!.trim()}
          </Markdown>
        </div>
      )}

      {hasSubmissionRequirements && (
        <div>
          <span className="text-content-emphasis font-semibold">
            Submission requirements
          </span>

          <div className="text-content-subtle mt-2 text-sm font-medium leading-5">
            {submissionTexts.map((text) => (
              <div className="flex items-start gap-1.5" key={text}>
                <Check2 className="mt-1 size-3 shrink-0 text-green-600" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasRewardCriteria && (
        <div>
          <span className="text-content-emphasis font-semibold">
            Reward criteria
          </span>

          <div className="text-content-subtle mt-2 text-sm font-medium leading-5">
            {rewardTexts.map((text) => (
              <div className="flex items-start gap-1.5" key={text}>
                <Check2 className="mt-1 size-3 shrink-0 text-green-600" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
