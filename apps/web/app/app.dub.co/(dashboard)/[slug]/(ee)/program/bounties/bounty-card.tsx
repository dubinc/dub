import { BountyProps } from "@/lib/types";
import { ProgramOverviewCard } from "@/ui/partners/overview/program-overview-card";
import { CalendarDays, Users } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import { Trophy } from "lucide-react";

export function BountyCard({ bounty }: { bounty: BountyProps }) {
  return (
    <ProgramOverviewCard className="cursor-pointer p-5 transition-shadow hover:shadow-lg">
      <div className="flex flex-col gap-5">
        <div className="flex h-[132px] items-center justify-center rounded-lg bg-neutral-100 px-32 py-4">
          <div className="relative">
            <Trophy className="size-20" />
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
                {bounty.totalSubmissions}
              </span>{" "}
              partners completed
            </div>
          </div>
        </div>
      </div>
    </ProgramOverviewCard>
  );
}
