import { resolveBountyDetails } from "@/lib/bounty/utils";
import { PartnerBountyProps } from "@/lib/types";
import { Check2 } from "@dub/ui";

export function getBountySubmissionRequirements(bounty: PartnerBountyProps) {
  const bountyInfo = resolveBountyDetails(bounty);

  if (!bountyInfo?.hasSocialMetrics || !bountyInfo.socialPlatform) {
    return [];
  }

  return [
    `Submit a ${bountyInfo.socialPlatform.label} link from your connected account`,
    "The content shared is posted after this bounty started",
  ];
}

export function BountySubmissionRequirements({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  const submissionTexts = getBountySubmissionRequirements(bounty);

  if (submissionTexts.length === 0) {
    return null;
  }

  return (
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
  );
}
