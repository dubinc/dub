"use client";

import { usePartnerProfileTopEarnings } from "@/lib/swr/use-partner-profile-top-earnings";
import { GridIcon } from "@dub/ui/icons";
import { cn, currencyFormatter } from "@dub/utils";
import Link from "next/link";
import {
  OVERVIEW_CARD_ROW_CLASSNAME,
  OverviewCard,
  OverviewCardList,
  ProgramLogo,
} from "./overview-card";
import { useOverviewDateRange } from "./use-overview-date-range";

export function TopProgramsCard() {
  const { start, end, interval } = useOverviewDateRange();

  const { data: programs, error } = usePartnerProfileTopEarnings({
    groupBy: "programId",
    limit: 6,
    interval,
    start,
    end,
  });

  return (
    <OverviewCard
      title="Top programs by earnings"
      viewAllHref="/programs"
      className="rounded-2xl"
    >
      <OverviewCardList
        items={programs}
        rowCount={6}
        error={error}
        getKey={(program) => program.id}
        emptyState={{
          icon: <GridIcon className="size-4" />,
          title: "No earnings in this date range",
        }}
        renderItem={(program) => (
          <Link
            href={`/programs/${program.slug}`}
            className={cn(
              OVERVIEW_CARD_ROW_CLASSNAME,
              "transition-colors duration-100 hover:bg-neutral-50 active:bg-neutral-100",
            )}
          >
            <ProgramLogo program={program} />
            <span className="text-content-emphasis min-w-0 grow truncate text-xs font-semibold">
              {program.name}
            </span>
            <span className="shrink-0 text-xs font-medium text-neutral-500">
              {currencyFormatter(program.earnings)}
            </span>
          </Link>
        )}
      />
    </OverviewCard>
  );
}
