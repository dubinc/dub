"use client";

import { testIds } from "@/lib/e2e/test-ids";
import { ProgramLogo } from "@/ui/partners/program-logo";
import { GridIcon } from "@dub/ui/icons";
import { cn, currencyFormatter, formatPercentage } from "@dub/utils";
import Link from "next/link";
import {
  OVERVIEW_CARD_ROW_CLASSNAME,
  OverviewCard,
  OverviewCardList,
} from "./overview-card";
import { useTopProgramEarnings } from "./use-top-program-earnings";

const ROW_COUNT = 6;

export function TopProgramsCard() {
  const { data, error } = useTopProgramEarnings();
  const programs = data?.slice(0, ROW_COUNT);

  // the share of positive earnings, so that the shares add up to 100%.
  // A net total can be lower than one program's earnings when other programs have clawbacks
  const positiveTotal = data?.reduce(
    (sum, program) => sum + Math.max(program.earnings, 0),
    0,
  );

  // the bars are relative to the top program, so its bar fills the name column.
  // the rows are sorted by earnings, so no other bar is wider.
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
        renderItem={(program, index) => (
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
                    index === 0 &&
                      "bg-gradient-to-r from-[#ededed] to-neutral-100",
                  )}
                  style={{
                    width: `calc(${(Math.max(program.earnings, 0) / topEarnings) * 100}% + 12px)`,
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
              {/* clawbacks can make a program's earnings negative, so it has no share */}
              {positiveTotal && program.earnings > 0
                ? `${formatPercentage((program.earnings / positiveTotal) * 100, { digits: 1 })}%`
                : null}
            </span>
          </Link>
        )}
      />
    </OverviewCard>
  );
}
