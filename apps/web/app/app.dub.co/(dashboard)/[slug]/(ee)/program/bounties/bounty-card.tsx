import useWorkspace from "@/lib/swr/use-workspace";
import { BountyProps } from "@/lib/types";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { Calendar6, Users } from "@dub/ui/icons";
import { formatDate, pluralize } from "@dub/utils";
import Link from "next/link";
import { BountyActionButton } from "./bounty-action-button";

export function BountyCard({ bounty }: { bounty: BountyProps }) {
  const { slug: workspaceSlug } = useWorkspace();

  return (
    <div className="border-border-subtle hover:border-border-default relative cursor-pointer rounded-xl border bg-white p-5 transition-all hover:shadow-lg">
      <Link
        href={`/${workspaceSlug}/program/bounties/${bounty.id}`}
        className="flex flex-col gap-5"
      >
        <div className="relative flex h-[132px] items-center justify-center rounded-lg bg-neutral-100 py-1.5">
          <div className="relative size-full">
            <BountyThumbnailImage bounty={bounty} />
          </div>

          {bounty.submissionsCount > 0 ? (
            <SubmissionsCountBadge count={bounty.submissionsCount} />
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-content-emphasis truncate text-sm font-semibold">
            {bounty.name}
          </h3>

          <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
            <Calendar6 className="size-3.5" />
            <span>
              {formatDate(bounty.startsAt, { month: "short" })}
              {bounty.endsAt && (
                <>
                  {" → "}
                  {formatDate(bounty.endsAt, { month: "short" })}
                </>
              )}
            </span>
          </div>

          <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
            <Users className="size-3.5" />
            <div className="h-5">
              Applied to {bounty.groups?.length ?? 0}{" "}
              {pluralize("group", bounty.groups?.length ?? 0)}
            </div>
          </div>
        </div>
      </Link>

      <BountyActionButton
        bounty={bounty}
        className="absolute right-7 top-7"
        buttonClassName="size-7 whitespace-nowrap p-0 hover:bg-neutral-200 active:bg-neutral-300 data-[state=open]:bg-neutral-300"
      />
    </div>
  );
}

function SubmissionsCountBadge({ count }: { count: number }) {
  return (
    <div className="absolute left-2 top-2 z-10">
      <div className="flex h-5 items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-600">
        {count} {pluralize("submission", count)}
      </div>
    </div>
  );
}

export function BountyCardSkeleton() {
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
          <div className="flex h-5 items-center space-x-2">
            <div className="size-4 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
