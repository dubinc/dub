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
import { useTopProgramEarnings } from "./use-top-program-earnings";

const ROW_COUNT = 6;

export function TopProgramsCard() {
  const { data, error } = useTopProgramEarnings();
  const programs = data?.slice(0, ROW_COUNT);

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
