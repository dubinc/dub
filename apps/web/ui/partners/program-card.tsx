import { usePartnerEarningsTimeseries } from "@/lib/swr/use-partner-earnings-timeseries";
import { ProgramEnrollmentProps, ProgramProps } from "@/lib/types";
import { BlurImage, Link4, MiniAreaChart } from "@dub/ui";
import {
  cn,
  formatDate,
  getPrettyUrl,
  nFormatter,
  OG_AVATAR_URL,
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
  banned: {
    label: "Banned",
    variant: "error",
  },
};

export function ProgramCard({
  programEnrollment,
}: {
  programEnrollment: ProgramEnrollmentProps;
}) {
  const { program, status, createdAt } = programEnrollment;

  const defaultLink = programEnrollment.links?.[0];

  const clickable = ["approved", "pending"].includes(status);

  const card = (
    <div
      className={cn(
        "block flex h-full flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5",
        clickable && "hover:drop-shadow-card-hover transition-[filter]",
      )}
    >
      <div>
        <BlurImage
          width={96}
          height={96}
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          alt={program.name}
          className="size-8 rounded-full border border-black/10"
        />
        <div className="mt-3 flex flex-col">
          <span className="text-base font-semibold text-neutral-800">
            {program.name}
          </span>
          {(defaultLink || program.domain) && (
            <div className="flex items-center gap-1 text-neutral-500">
              <Link4 className="size-3" />
              <span className="text-sm font-medium">
                {defaultLink?.shortLink
                  ? getPrettyUrl(defaultLink.shortLink)
                  : program.domain}
              </span>
            </div>
          )}
        </div>
      </div>
      {status === "approved" ? (
        <ProgramCardEarnings program={program} />
      ) : (
        <div className="mt-4 flex h-24 items-center justify-center text-balance rounded-md border border-neutral-200 bg-neutral-50 p-5 text-center text-sm text-neutral-500">
          {status === "pending"
            ? `Applied ${formatDate(createdAt)}`
            : status === "banned"
              ? `You're banned from this program`
              : `You will be able to apply again after ${formatDate(
                  addDays(createdAt, 30),
                )}`}
        </div>
      )}
    </div>
  );

  return clickable ? (
    <Link href={`/programs/${program.slug}`}>{card}</Link>
  ) : (
    card
  );
}

function ProgramCardEarnings({ program }: { program: ProgramProps }) {
  const { data: timeseries } = usePartnerEarningsTimeseries({
    programId: program.id,
    interval: "1y",
  });

  const total = useMemo(
    () => timeseries?.reduce((acc, { earnings }) => acc + earnings, 0),
    [timeseries],
  );

  const chartData = useMemo(
    () =>
      timeseries?.map((d) => ({
        date: new Date(d.start),
        value: d.earnings,
      })),
    [timeseries],
  );

  return (
    <div className="mt-4 grid grid-cols-[min-content,minmax(0,1fr)] gap-4 rounded-md border border-neutral-200 bg-neutral-50">
      <div className="py-3 pl-4">
        <div className="whitespace-nowrap text-sm text-neutral-500">
          Earnings
        </div>
        {total !== undefined ? (
          <div className="text-xl font-medium text-neutral-800">
            $
            {nFormatter((total || 0) / 100, {
              digits: total < 1000_00 ? 2 : 1,
            })}
          </div>
        ) : (
          <div className="mt-1 h-6 w-20 animate-pulse rounded-md bg-neutral-200" />
        )}
      </div>
      {chartData && (
        <div className="relative h-full px-3">
          <MiniAreaChart data={chartData} padding={{ top: 16, bottom: 16 }} />
        </div>
      )}
    </div>
  );
}

export function ProgramCardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 p-5">
      <div className="size-8 rounded-full bg-neutral-200" />
      <div className="mt-3 flex flex-col">
        <div className="my-0.5 h-5 w-24 min-w-0 rounded-md bg-neutral-200" />
        <div className="my-0.5 h-4 w-20 animate-pulse rounded-md bg-neutral-200" />
      </div>
      <div className="mt-4 h-[72px] animate-pulse rounded-md bg-neutral-100" />
    </div>
  );
}
