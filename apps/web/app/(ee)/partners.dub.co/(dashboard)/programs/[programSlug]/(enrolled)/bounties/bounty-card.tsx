import { BountyWithSubmissionsProps } from "@/lib/types";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { useClaimBountyModal } from "@/ui/partners/bounties/claim-bounty-modal";
import { Button } from "@dub/ui";
import { Calendar6, CircleCheckFill } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";

export function BountyCard({ bounty }: { bounty: BountyWithSubmissionsProps }) {
  const submission = bounty.submissions?.[0];

  const { claimBountyModal, setShowClaimBountyModal } = useClaimBountyModal({
    bounty,
  });

  return (
    <div className="border-border-subtle flex flex-col gap-5 rounded-xl border bg-white p-5">
      {claimBountyModal}
      <div className="relative flex h-[132px] items-center justify-center rounded-lg bg-neutral-100 py-1.5">
        <div className="relative size-full">
          <BountyThumbnailImage bounty={bounty} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-content-emphasis truncate text-sm font-semibold">
          {bounty.name}
        </h3>

        <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
          <Calendar6 className="size-3.5" />
          <span>
            {bounty.endsAt ? (
              <>
                Ends
                {formatDate(bounty.endsAt, { month: "short" })}
              </>
            ) : (
              "No end date"
            )}
          </span>
        </div>
      </div>

      <div className="flex grow flex-col justify-end">
        {submission ? (
          submission.status === "pending" ? (
            <div className="flex h-7 w-fit items-center gap-1 rounded-lg bg-neutral-100 px-2.5">
              <CircleCheckFill className="size-3 text-green-600" />
              <span className="text-content-default text-xs font-medium">
                Completed
                {submission.reviewedAt &&
                  formatDate(submission.reviewedAt, { month: "short" })}
              </span>
            </div>
          ) : (
            <div className="flex h-7 w-fit items-center gap-1 rounded-lg bg-orange-100 px-2.5">
              <span className="text-xs font-medium text-orange-600">
                Submitted
                {submission.createdAt &&
                  formatDate(submission.createdAt, { month: "short" })}
              </span>
            </div>
          )
        ) : (
          <Button
            variant="primary"
            text="Claim bounty"
            className="h-7 w-fit rounded-lg px-2.5"
            onClick={() => setShowClaimBountyModal(true)}
          />
        )}
      </div>
    </div>
  );
}

export const BountyCardSkeleton = () => {
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
