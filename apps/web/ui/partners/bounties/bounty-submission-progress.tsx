import { PartnerBountyProps } from "@/lib/types";
import { cn } from "@dub/utils";
import {
  BountyProgressBarRow,
  EmphasisNumber,
} from "./bounty-progress-bar-row";

export function BountySubmissionProgress({
  bounty,
  labelClassName,
  wrapperClassName,
  className,
}: {
  bounty: PartnerBountyProps;
  labelClassName?: string;
  wrapperClassName?: string;
  className?: string;
}) {
  const submittedCount = bounty.submissions.filter(
    ({ status }) => status !== "draft",
  ).length;

  const approvedCount = bounty.submissions.filter(
    ({ status }) => status === "approved",
  ).length;

  const submittedPercent = (submittedCount / bounty.maxSubmissions) * 100;
  const approvedPercent = (approvedCount / bounty.maxSubmissions) * 100;

  return (
    <div className={cn("flex gap-4", className)}>
      <BountyProgressBarRow
        progress={submittedPercent}
        labelClassName={labelClassName}
        wrapperClassName={wrapperClassName}
      >
        <EmphasisNumber>{submittedCount}</EmphasisNumber> of{" "}
        <EmphasisNumber>{bounty.maxSubmissions}</EmphasisNumber> submitted
      </BountyProgressBarRow>
      <BountyProgressBarRow
        progress={approvedPercent}
        labelClassName={labelClassName}
        wrapperClassName={wrapperClassName}
      >
        <EmphasisNumber>{approvedCount}</EmphasisNumber> approved
      </BountyProgressBarRow>
    </div>
  );
}
