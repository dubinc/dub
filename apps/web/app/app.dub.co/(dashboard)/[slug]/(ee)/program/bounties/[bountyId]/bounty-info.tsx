"use client";

import useBounty from "@/lib/swr/use-bounty";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { formatDate, pluralize } from "@dub/utils";
import { CalendarDays, Users } from "lucide-react";

export function BountyInfo() {
  const { bounty, loading } = useBounty();

  if (loading) {
    return null;
  }

  if (!bounty) {
    return null;
  }

  const { pending = 0, approved = 0, rejected = 0 } = bounty.submissions;
  const totalSubmissions = pending + approved + rejected;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative flex size-16 shrink-0 items-center justify-center rounded-lg bg-neutral-100 p-3 sm:size-[90px]">
        {bounty && <BountyThumbnailImage bounty={bounty} />}
      </div>

      {bounty && (
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="truncate text-base font-semibold leading-6 text-neutral-900">
            {bounty.name}
          </h3>

          <div className="flex items-center space-x-2">
            <CalendarDays className="size-4 shrink-0" />
            <span className="text-sm font-medium text-neutral-500">
              {formatDate(bounty.startsAt, { month: "short" })}
              {" → "}
              {bounty.endsAt
                ? formatDate(bounty.endsAt, { month: "short" })
                : "No end date"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Users className="size-4 shrink-0" />
            <div className="text-sm text-neutral-500">
              <span className="font-medium text-neutral-700">
                {totalSubmissions}
              </span>{" "}
              of{" "}
              <span className="font-medium text-neutral-700">
                {bounty.partners}
              </span>{" "}
              {pluralize("partner", bounty.partners ?? 0)} completed
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
