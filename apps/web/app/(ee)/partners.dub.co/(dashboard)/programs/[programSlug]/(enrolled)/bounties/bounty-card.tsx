import { PartnerBountyProps } from "@/lib/types";
import {
  PerformanceBountyProgress,
  SubmissionBountyProgress,
} from "@/ui/partners/bounties/bounty-performance";
import { BountyRewardDescription } from "@/ui/partners/bounties/bounty-reward-description";
import { BountyStatusBadge } from "@/ui/partners/bounties/bounty-status-badge";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { buttonVariants, Table, TimestampTooltip, useTable } from "@dub/ui";
import { Calendar6 } from "@dub/ui/icons";
import {
  cn,
  currencyFormatter,
  formatDate,
  formatDateTimeSmart,
} from "@dub/utils";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export function PartnerBountyCard({
  bounty,
  showFullTitle = false,
  hideFooter = false,
  showRewards = false,
  onClick,
}: {
  bounty: PartnerBountyProps;
  showFullTitle?: boolean;
  hideFooter?: boolean;
  showRewards?: boolean;
  onClick?: () => void;
}) {
  const { programSlug } = useParams();
  const router = useRouter();

  const handleClick =
    onClick ??
    (() => router.push(`/programs/${programSlug}/bounties/${bounty.id}`));

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (e.key === " ") e.preventDefault();
          handleClick();
        }
      }}
      className="border-border-subtle group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-white text-left dark:bg-black"
    >
      <div className="p-3 pb-0">
        <div className="relative flex h-[124px] items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
          <div className="relative size-full">
            <BountyThumbnailImage bounty={bounty} />
          </div>

          <BountyStatusBadge bounty={bounty} />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1 px-5 py-4">
        <h3
          className={cn(
            "text-content-emphasis text-sm font-semibold",
            !showFullTitle && "sm:truncate",
          )}
        >
          {bounty.name}
        </h3>

        <BountyEndDate bounty={bounty} />

        <BountyRewardDescription
          bounty={bounty}
          onTooltipClick={(e) => e.stopPropagation()}
          className="font-medium"
        />
      </div>

      {!hideFooter && (
        <div className="border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
          {bounty.type === "performance" ? (
            <PerformanceBountyProgress bounty={bounty} />
          ) : (
            <SubmissionBountyProgress bounty={bounty} />
          )}
        </div>
      )}

      {showRewards && bounty.submissions.some((s) => s.commission != null) && (
        <div className="@3xl/page:block hidden border-t border-neutral-200 p-4 dark:border-neutral-800">
          <BountyRewardsTable
            bounty={bounty}
            programSlug={programSlug as string}
          />
        </div>
      )}
    </div>
  );
}

export function BountyRewardsTable({
  bounty,
  programSlug,
  className,
}: {
  bounty: PartnerBountyProps;
  programSlug?: string;
  className?: string;
}) {
  const rewards = bounty.submissions
    .filter((s) => s.commission != null)
    .map((s) => s.commission!);

  const { table, ...tableProps } = useTable({
    data: rewards,
    columns: [
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => currencyFormatter(row.original.earnings),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const badge = CommissionStatusBadges[row.original.status];

          return badge ? (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-semibold",
                badge.className,
              )}
            >
              {badge.label}
            </span>
          ) : null;
        },
      },
    ],
    thClassName: "border-l-transparent py-1.5",
    tdClassName: "border-l-transparent py-1.5",
  });

  if (rewards.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="@3xl/page:text-sm text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Rewards
        </h3>
        {programSlug && (
          <Link
            href={`/programs/${programSlug}/earnings?type=custom`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "border-border-subtle flex h-6 items-center rounded-md border px-2 text-xs",
            )}
          >
            View all
          </Link>
        )}
      </div>
      <Table
        {...tableProps}
        table={table}
        containerClassName="border-neutral-200 dark:border-neutral-800"
        scrollWrapperClassName="min-h-0"
        className="[&_tbody_tr:last-child_td]:border-b-0"
      />
    </div>
  );
}

export function BountyEndDate({ bounty }: { bounty: PartnerBountyProps }) {
  const isExpired =
    bounty.endsAt && new Date(bounty.endsAt) < new Date() ? true : false;

  return (
    <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
      <Calendar6 className="size-3.5" />
      {bounty.endsAt ? (
        <span>
          {isExpired ? "Ended" : "Ends"} at{" "}
          <TimestampTooltip
            timestamp={bounty.endsAt}
            side="right"
            rows={["local", "utc"]}
          >
            <span className="hover:text-content-emphasis underline decoration-dotted underline-offset-2">
              {formatDateTimeSmart(bounty.endsAt)}
            </span>
          </TimestampTooltip>
        </span>
      ) : (
        <span>
          {formatDate(bounty.startsAt, { month: "short" })} → No end date
        </span>
      )}
    </div>
  );
}

export const PartnerBountyCardSkeleton = () => {
  return (
    <div className="border-border-subtle rounded-xl border bg-white p-5 dark:bg-black">
      <div className="flex flex-col gap-5">
        <div className="flex h-[132px] animate-pulse items-center justify-center rounded-lg bg-neutral-100 px-32 py-4 dark:bg-neutral-800" />
        <div className="flex flex-col gap-1.5">
          <div className="h-5 w-48 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-700" />
          <div className="flex h-5 items-center space-x-2">
            <div className="size-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
          </div>
        </div>
      </div>
    </div>
  );
};
