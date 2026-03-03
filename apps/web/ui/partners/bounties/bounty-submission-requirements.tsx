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
      <h3 className="text-content-emphasis text-lg font-semibold">
        Submission requirements
      </h3>

      <div className="mt-2 flex flex-col gap-1">
        {submissionTexts.map((text) => (
          <div className="flex items-center gap-1.5" key={text}>
            <Check2 className="size-3 shrink-0 text-green-600" />
            <span className="text-sm font-normal text-neutral-600">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
