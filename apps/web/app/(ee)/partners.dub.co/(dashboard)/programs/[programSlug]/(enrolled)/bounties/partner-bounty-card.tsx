import { getBountyRewardDescription } from "@/lib/partners/get-bounty-reward-description";
import { PartnerBountyProps } from "@/lib/types";
import { BountyPerformance } from "@/ui/partners/bounties/bounty-performance";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { useClaimBountyModal } from "@/ui/partners/bounties/claim-bounty-modal";
import { StatusBadge } from "@dub/ui";
import { Calendar6, Gift } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";

export function PartnerBountyCard({ bounty }: { bounty: PartnerBountyProps }) {
  const { claimBountyModal, setShowClaimBountyModal } = useClaimBountyModal({
    bounty,
  });

  return (
    <>
      {claimBountyModal}
      <button
        type="button"
        onClick={() => setShowClaimBountyModal(true)}
        className="border-border-subtle hover:border-border-default group relative flex cursor-pointer flex-col gap-5 overflow-hidden rounded-xl border bg-white p-5 text-left transition-all hover:shadow-lg"
      >
        <div className="relative flex h-[132px] items-center justify-center rounded-lg bg-neutral-100 py-1.5">
          <div className="relative size-full">
            <BountyThumbnailImage bounty={bounty} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="text-content-emphasis truncate text-sm font-semibold">
            {bounty.name}
          </h3>

          <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
            <Calendar6 className="size-3.5" />
            <span>
              {bounty.endsAt ? (
                <>Ends {formatDate(bounty.endsAt, { month: "short" })}</>
              ) : (
                "No end date"
              )}
            </span>
          </div>

          <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
            <Gift className="size-3.5 shrink-0" />
            <span className="truncate">
              {getBountyRewardDescription(bounty)}
            </span>
          </div>
        </div>

        <div className="flex grow flex-col justify-end">
          {renderSubmissionStatus({
            bounty,
            setShowClaimBountyModal,
          })}
        </div>
      </button>
    </>
  );
}

export const PartnerBountyCardSkeleton = () => {
  return (
    <div className="border-border-subtle rounded-xl border bg-white p-5">
      <div className="flex flex-col gap-5">
        <div className="flex h-[132px] animate-pulse items-center justify-center rounded-lg bg-neutral-100 px-32 py-4" />

        <div className="flex flex-col gap-1.5">
          <div className="h-5 w-48 animate-pulse rounded-md bg-neutral-200" />

          <div className="flex h-5 items-center space-x-2">
            <div className="size-4 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    </div>
  );
};

function renderSubmissionStatus({
  bounty,
  setShowClaimBountyModal,
}: {
  bounty: PartnerBountyProps;
  setShowClaimBountyModal: (show: boolean) => void;
}) {
  const { submission } = bounty;

  // When there is no submission, we show the performance or claim bounty button
  if (!submission) {
    return bounty.type === "performance" ? (
      <BountyPerformance bounty={bounty} />
    ) : (
      <div
        className="group-hover:ring-border-subtle flex h-7 w-fit items-center rounded-lg bg-black px-2.5 text-sm text-white transition-all group-hover:ring-2"
        onClick={() => setShowClaimBountyModal(true)}
      >
        Claim bounty
      </div>
    );
  }

  switch (submission.status) {
    case "draft":
      return bounty.type === "performance" ? (
        <BountyPerformance bounty={bounty} />
      ) : (
        <div
          className="group-hover:ring-border-subtle flex h-7 w-fit items-center rounded-lg bg-black px-2.5 text-sm text-white transition-all group-hover:ring-2"
          onClick={() => setShowClaimBountyModal(true)}
        >
          Continue submission
        </div>
      );

    case "submitted":
      return (
        <StatusBadge variant="new" icon={null}>
          {bounty.type === "performance" ? "Completed" : "Submitted"}{" "}
          {submission.completedAt &&
            formatDate(submission.completedAt, { month: "short" })}
        </StatusBadge>
      );

    case "rejected":
      return (
        <StatusBadge variant="error" icon={null}>
          Rejected
        </StatusBadge>
      );

    case "approved":
    default:
      return (
        <StatusBadge variant="success">
          Confirmed{" "}
          {submission.reviewedAt &&
            formatDate(submission.reviewedAt, { month: "short" })}
        </StatusBadge>
      );
  }
}
