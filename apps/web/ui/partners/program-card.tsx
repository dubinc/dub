import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import { ProgramEnrollmentProps, ProgramProps } from "@/lib/types";
import { BlurImage, MiniAreaChart, StatusBadge } from "@dub/ui";
import {
  cn,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  formatDate,
} from "@dub/utils";
import { addDays } from "date-fns";
import Link from "next/link";
import { useMemo } from "react";

export const ProgramEnrollmentStatusBadges = {
  approved: {
    label: "Enrolled",
    variant: "success",
    className: "text-green-600 bg-green-100",
  },
  pending: {
    label: "Pending",
    variant: "pending",
  },
  rejected: {
    label: "Rejected",
    variant: "error",
  },
};

export function ProgramCard({
  programEnrollment,
}: {
  programEnrollment: ProgramEnrollmentProps;
}) {
  const { program, status, createdAt } = programEnrollment;

  const card = (
    <div
      className={cn(
        "block rounded-md border border-neutral-300 bg-white p-4",
        status === "approved"
          ? "hover:drop-shadow-card-hover transition-[filter]"
          : "",
      )}
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
          <StatusBadge
            variant={ProgramEnrollmentStatusBadges[status].variant}
            icon={null}
            className="rounded-full py-0.5"
          >
            {ProgramEnrollmentStatusBadges[status].label}
          </StatusBadge>
        </div>
      </div>
      {status === "approved" ? (
        <ProgramCardEarnings program={program} />
      ) : (
        <div className="mt-4 flex h-24 items-center justify-center text-balance rounded-md border border-neutral-100 bg-neutral-50 p-5 text-center text-sm text-neutral-500">
          {status === "pending"
            ? `Applied ${formatDate(createdAt)}`
            : `You will be able to apply again after ${formatDate(
                addDays(createdAt, 30),
              )}`}
        </div>
      )}
    </div>
  );

  return status === "approved" ? (
    <Link href={`/programs/${program.slug}`}>{card}</Link>
  ) : (
    card
  );
}

function ProgramCardEarnings({ program }: { program: ProgramProps }) {
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
    <div className="mt-4 grid h-24 grid-cols-[min-content,minmax(0,1fr)] gap-4 rounded-md border border-neutral-100 bg-neutral-50 p-5">
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
  );
}

export function ProgramCardSkeleton() {
  return (
    <div className="rounded-md border border-neutral-300 p-4">
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-full bg-neutral-200" />
        <div className="flex flex-col gap-0.5">
          <div className="h-6 w-24 min-w-0 rounded-md bg-neutral-200" />
          <div className="h-3.5 w-20 animate-pulse rounded-md bg-neutral-200" />
        </div>
      </div>
      <div className="mt-6 grid h-[90px] animate-pulse rounded-md bg-neutral-100" />
    </div>
  );
}
