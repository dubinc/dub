"use client";

import useBounty from "@/lib/swr/use-bounty";
import { formatDate } from "@dub/utils";
import { CalendarDays, Trophy, Users } from "lucide-react";
import { useParams } from "next/navigation";

export function BountyInfo() {
  const { bountyId } = useParams<{ bountyId: string }>();
  const { bounty } = useBounty({ bountyId });

  const completed = 50;

  return (
    <div className="flex items-center gap-6">
      <div className="flex h-[90px] w-[90px] shrink-0 items-center justify-center rounded-lg bg-neutral-100 p-5">
        <Trophy className="size-12" />
      </div>

      {bounty && (
        <div className="flex flex-1 flex-col gap-1.5">
          <h3 className="text-base font-semibold leading-6 text-neutral-900">
            {bounty.name}
          </h3>

          <div className="flex items-center space-x-2">
            <CalendarDays className="size-4" />
            <span className="text-sm font-medium text-neutral-500">
              {formatDate(bounty.startsAt, { month: "short" })}
              {" → "}
              {bounty.endsAt
                ? formatDate(bounty.endsAt, { month: "short" })
                : "No end date"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Users className="size-4" />
            <div className="text-sm text-neutral-500">
              <span className="font-medium text-neutral-700">{completed}</span>{" "}
              of{" "}
              <span className="font-medium text-neutral-700">
                {bounty.submissionsCount}
              </span>{" "}
              partners completed
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
