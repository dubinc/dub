import {
  getBountyRewardCriteriaTexts,
  getBountySubmissionRequirementTexts,
} from "@/lib/bounty/utils";
import { PartnerBountyProps } from "@/lib/types";
import { Markdown } from "@/ui/shared/markdown";
import { Check2, PROSE_STYLES } from "@dub/ui";
import { cn } from "@dub/utils";

export function BountyDescription({ bounty }: { bounty: PartnerBountyProps }) {
  if (!bounty.description) {
    return null;
  }

  const submissionTexts = getBountySubmissionRequirementTexts(bounty);
  const rewardTexts = getBountyRewardCriteriaTexts(bounty);

  return (
    <>
      <div>
        <span className="text-content-emphasis font-semibold">Details</span>
        <Markdown
          className={cn(
            PROSE_STYLES.default,
            "text-content-subtle text-sm font-medium leading-5",
          )}
        >
          {bounty.description}
        </Markdown>
      </div>

      <div>
        <span className="text-content-emphasis font-semibold">
          Submission requirements
        </span>

        <div className="text-content-subtle mt-2 text-sm font-medium leading-5">
          {submissionTexts.map((text) => (
            <div className="flex items-center gap-1.5">
              <Check2 className="size-3 text-green-600" />
              <span key={text}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-content-emphasis font-semibold">
          Reward criteria
        </span>

        <div className="text-content-subtle mt-2 text-sm font-medium leading-5">
          {rewardTexts.map((text) => (
            <div className="flex items-center gap-1.5">
              <Check2 className="size-3 text-green-600" />
              <span key={text}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
