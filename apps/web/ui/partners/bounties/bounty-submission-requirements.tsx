import { resolveBountyDetails } from "@/lib/bounty/utils";
import { PartnerBountyProps } from "@/lib/types";
import { Check2 } from "@dub/ui";

export function getBountySubmissionRequirements(bounty: PartnerBountyProps) {
  const bountyInfo = resolveBountyDetails(bounty);
  const requirements: string[] = [];

  const reqs = bounty.submissionRequirements;

  if (reqs?.image) {
    requirements.push(
      reqs.image.max
        ? `Submit up to ${reqs.image.max} image${reqs.image.max === 1 ? "" : "s"}`
        : "Submit an image",
    );
  }

  if (reqs?.url) {
    requirements.push(
      reqs.url.max
        ? `Submit up to ${reqs.url.max} URL${reqs.url.max === 1 ? "" : "s"}`
        : "Submit a URL",
    );
    if (reqs.url.domains?.length) {
      requirements.push(`URL must be from: ${reqs.url.domains.join(", ")}`);
    }
  }

  if (bountyInfo?.hasSocialMetrics && bountyInfo.socialPlatform) {
    requirements.push(
      `Submit a ${bountyInfo.socialPlatform.label} link from your connected account`,
      "The content shared is posted after this bounty started",
    );
  }

  return requirements;
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
      <h3 className="text-content-emphasis text-sm font-semibold">
        Submission requirements
      </h3>

      <div className="mt-2 flex flex-col gap-1">
        {submissionTexts.map((text) => (
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
