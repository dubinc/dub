import { BountyProps } from "@/lib/types";
import { ProgramOverviewCard } from "@/ui/partners/overview/program-overview-card";
import { CalendarDays, Users } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import Link from "next/link";

export function BountyCard({ bounty }: { bounty: BountyProps }) {
  return (
    <ProgramOverviewCard className="cursor-pointer border-neutral-200 p-5 transition-all hover:border-neutral-300 hover:shadow-lg">
      <Link
        href={`/program/bounties/${bounty.id}`}
        className="flex flex-col gap-5"
      >
        <div className="flex h-[132px] items-center justify-center rounded-lg bg-neutral-100 py-1.5">
          <div className="relative size-full">
            <img
              {...(bounty.type === "performance"
                ? {
                    src: "https://assets.dub.co/icons/trophy.webp",
                    alt: "Trophy thumbnail",
                  }
                : {
                    src: "https://assets.dub.co/icons/heart.webp",
                    alt: "Heart thumbnail",
                  })}
              className="size-full object-contain"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="line-clamp-1 text-sm font-semibold text-neutral-900">
            {bounty.name}
          </h3>

          <div className="flex items-center space-x-2">
            <CalendarDays className="size-4" />
            <span className="text-sm text-neutral-500">
              {formatDate(bounty.startsAt, { month: "short" })}
              {bounty.endsAt && (
                <>
                  {" → "}
                  {formatDate(bounty.endsAt, { month: "short" })}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Users className="size-4" />
            <div className="text-sm text-neutral-500">
              <span className="font-medium text-neutral-700">{100}</span> of{" "}
              <span className="font-medium text-neutral-700">
                {/* {bounty.submissionsCount} */} X
              </span>{" "}
              partners completed
            </div>
          </div>
        </div>
      </Link>
    </ProgramOverviewCard>
  );
}

export const BountyCardSkeleton = () => {
  return (
    <ProgramOverviewCard className="cursor-pointer p-5 transition-shadow hover:shadow-lg">
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
    </ProgramOverviewCard>
  );
};
