"use client";

import { testIds } from "@/lib/e2e/test-ids";
import { ProgramLogo } from "@/ui/partners/program-logo";
import { GridIcon } from "@dub/ui/icons";
import { cn, currencyFormatter } from "@dub/utils";
import Link from "next/link";
import {
  OVERVIEW_CARD_ROW_CLASSNAME,
  OverviewCard,
  OverviewCardList,
} from "./overview-card";
import { useOverviewEarningsTimeseries } from "./use-overview-earnings-timeseries";
import { useTopProgramEarnings } from "./use-top-program-earnings";

const ROW_COUNT = 6;

const shareFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

function formatShare(share: number) {
  return share > 0 && share < 0.001 ? "<0.1%" : shareFormatter.format(share);
}

export function TopProgramsCard() {
  const { data, error } = useTopProgramEarnings();
  const { total } = useOverviewEarningsTimeseries();
  const programs = data?.slice(0, ROW_COUNT);

  // the bars are relative to the top program, so its bar fills the name column
  const topEarnings = programs?.[0]?.earnings ?? 0;

  return (
    <OverviewCard
      title="Top programs by earnings"
      viewAllHref="/programs"
      className="rounded-2xl"
      testId={testIds.partnerOverview.topPrograms}
    >
      <OverviewCardList
        items={programs}
        rowCount={ROW_COUNT}
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
            <div className="relative flex min-w-0 grow items-center gap-2.5">
              {topEarnings > 0 && (
                <div
                  className={cn(
                    "absolute -left-3 top-1/2 h-8 -translate-y-1/2 rounded-lg bg-neutral-100",
                    program.id === programs?.[0]?.id &&
                      "bg-gradient-to-r from-[#ededed] to-neutral-100",
                  )}
                  style={{
                    width: `calc(${Math.min(Math.max(program.earnings / topEarnings, 0), 1) * 100}% + 12px)`,
                  }}
                />
              )}
              <ProgramLogo program={program} className="relative" />
              <span className="text-content-emphasis relative min-w-0 grow truncate text-xs font-semibold">
                {program.name}
              </span>
            </div>
            <span className="shrink-0 text-xs font-medium text-neutral-500">
              {currencyFormatter(program.earnings)}
            </span>
            <span className="w-10 shrink-0 text-right text-xs font-medium text-neutral-600">
              {/* clawbacks can make earnings or the total negative, and other programs' clawbacks can make one share exceed the total */}
              {total && total > 0 && program.earnings > 0
                ? formatShare(Math.min(program.earnings / total, 1))
                : null}
            </span>
          </Link>
        )}
      />
    </OverviewCard>
  );
}
