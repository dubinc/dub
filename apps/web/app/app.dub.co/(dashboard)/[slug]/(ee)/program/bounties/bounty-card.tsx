import { BountyProps } from "@/lib/types";
import { ProgramOverviewCard } from "@/ui/partners/overview/program-overview-card";
import { CalendarDays, Users } from "@dub/ui/icons";
import { formatDate } from "@dub/utils";
import { Trophy } from "lucide-react";

export function BountyCard({ bounty }: { bounty: BountyProps }) {
  const { name, startsAt, endsAt } = bounty;

  const total = 1000;
  const completed = 400;

  return (
    <ProgramOverviewCard className="cursor-pointer p-5 transition-shadow hover:shadow-lg">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-center rounded-lg bg-neutral-50 px-32 py-4">
          <div className="relative">
            <Trophy className="size-14" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="line-clamp-1 text-sm font-semibold text-neutral-900">
            {name}
          </h3>

          <div className="flex items-center space-x-2 text-sm text-neutral-500">
            <CalendarDays className="size-4" />
            <span>
              {formatDate(startsAt, { month: "short" })}
              {endsAt && (
                <>
                  {" → "}
                  {formatDate(endsAt, { month: "short" })}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-sm text-neutral-700">
            <Users className="size-4" />
            <div>
              <span className="font-medium">{completed}</span> of{" "}
              <span className="font-medium">{total}</span> partners completed
            </div>
          </div>
        </div>
      </div>
    </ProgramOverviewCard>
  );
}
