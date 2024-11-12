"use client";

import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import { ProgramProps } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { MiniAreaChart } from "@dub/blocks";
import { BlurImage, MaxWidthWrapper } from "@dub/ui";
import { CircleDollar, GridIcon } from "@dub/ui/src/icons";
import {
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
  nFormatter,
} from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";

export function PartnersDashboardPageClient() {
  const { partnerId } = useParams() as {
    partnerId?: string;
  };

  const { data: programs, error } = useSWR<ProgramProps[]>(
    `/api/partners/${partnerId}/programs`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return (
    <MaxWidthWrapper>
      {programs === undefined ? (
        error ? (
          <div className="mt-8 text-center text-sm text-neutral-500">
            Failed to load programs
          </div>
        ) : (
          <ProgramsListSkeleton />
        )
      ) : programs.length > 0 ? (
        <ProgramsList programs={programs} />
      ) : (
        <AnimatedEmptyState
          title="No programs found"
          description="Enroll in programs to start earning."
          cardContent={
            <>
              <GridIcon className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-gray-500">
                <CircleDollar className="size-3.5" />
              </div>
            </>
          }
          learnMoreHref="https://dub.co/help/article/dub-conversions"
        />
      )}
    </MaxWidthWrapper>
  );
}

function ProgramsList({ programs }: { programs: ProgramProps[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {programs.map((program) => (
        <ProgramCard key={program.id} program={program} />
      ))}
    </div>
  );
}

function ProgramCard({ program }: { program: ProgramProps }) {
  const { partnerId } = useParams() as {
    partnerId?: string;
  };

  const { data: analytics } = usePartnerAnalytics({
    programId: program.id,
  });
  const { data: timeseries } = usePartnerAnalytics({
    programId: program.id,
    groupBy: "timeseries",
    interval: "30d",
  });

  const chartData = useMemo(
    () =>
      timeseries?.map((d) => ({
        date: new Date(d.start),
        value: d.earnings,
      })),
    [timeseries],
  );

  return (
    <Link
      href={`/${partnerId}/${program.id}`}
      className="hover:drop-shadow-card-hover block rounded-md border border-neutral-300 bg-white p-4 transition-[filter]"
    >
      <div className="flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-full border border-gray-200 bg-gradient-to-t from-gray-100">
          <BlurImage
            width={96}
            height={96}
            src={program.logo || `${DICEBEAR_AVATAR_URL}${program.name}`}
            alt={program.name}
            className="size-6 rounded-full"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-medium text-neutral-900">
            {program.name}
          </span>
          {analytics ? (
            <span className="text-sm leading-none text-neutral-600">
              {nFormatter(analytics?.sales)} sales
            </span>
          ) : (
            <div className="h-3.5 w-20 animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-[min-content,minmax(0,1fr)] gap-4 rounded-md border border-neutral-100 bg-neutral-50 p-5">
        <div>
          <div className="whitespace-nowrap text-sm text-neutral-500">
            Earnings
          </div>
          {analytics ? (
            <div className="mt-1 text-2xl font-medium leading-none text-neutral-800">
              {currencyFormatter(analytics?.earnings / 100 || 0)}
            </div>
          ) : (
            <div className="mt-1 h-6 w-20 animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
        {chartData && (
          <div className="relative h-full">
            <MiniAreaChart data={chartData} />
          </div>
        )}
      </div>
    </Link>
  );
}

function ProgramsListSkeleton() {
  return (
    <div className="grid animate-pulse gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(2)].map((_, idx) => (
        <div key={idx} className="rounded-md border border-neutral-300 p-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-full bg-neutral-200" />
            <div className="flex flex-col gap-0.5">
              <div className="h-6 w-24 min-w-0 rounded-md bg-neutral-200" />
              <div className="h-3.5 w-20 animate-pulse rounded-md bg-neutral-200" />
            </div>
          </div>
          <div className="mt-6 grid h-[90px] animate-pulse rounded-md bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}
